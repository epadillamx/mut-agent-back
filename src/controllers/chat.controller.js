import { createTicketGraph } from '../graph/workflow.js';
import { createInitialState, STEPS } from '../graph/state.js';
import logger from '../utils/logger.js';
import * as conversationService from '../services/conversation.service.js';
import { restoreStateFromDB } from '../utils/utils.js';
import { getUseremail } from '../services/getuseremail.service.js';
import { checkSessionPhone } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';

// Almacén de sesiones en memoria
const sessions = new Map();

/**
 * Procesa un mensaje del chat
 * @param {string} sessionId - ID de la sesión
 * @param {string} phone - Teléfono del usuario
 * @param {string} userMessage - Mensaje del usuario
 * @returns {Promise<string>} - Respuesta del asistente
 */
export async function processMessage(phone, userMessage, messageId) {
  logger.info('Procesando mensaje', { phone });

  try {
    // Obtener o crear sesión
    let state;
    let conversationId;


    const sessionIdaux = await checkSessionPhone(phone);
    let sessionId = uuidv4();
    if (sessionIdaux) {
      sessionId = sessionIdaux['session_id']
    }

    if (!sessions.has(sessionId)) {
      // Intentar recuperar conversación existente de la BD
      const existingConversation = await conversationService.getConversationBySession(sessionId);

      if (existingConversation && existingConversation.lastState) {
        // Restaurar estado desde la BD
        state = existingConversation.lastState.state;
        state = restoreStateFromDB(state);
        conversationId = existingConversation.id;
        state.userPhone = phone;
        logger.info('Conversación restaurada desde BD', { conversationId });
      } else {
        // Crear nueva conversación
        state = createInitialState();
        state.userPhone = phone;
        state = await getUseremail(phone, state);
        conversationId = await conversationService.createConversation(sessionId, null, phone);
        logger.info('Nueva conversación creada', { conversationId });
      }

      // Guardar en memoria con el ID de conversación
      sessions.set(sessionId, { state, conversationId });
    } else {
      const sessionData = sessions.get(sessionId);
      state = sessionData.state;
      conversationId = sessionData.conversationId;
    }

    // Si hay un mensaje del usuario, agregarlo al historial y BD
    if (userMessage) {
      state.conversationHistory.push({
        user: userMessage,
        timestamp: new Date().toISOString()
      });

      // Guardar mensaje en BD
      await conversationService.saveMessage(
        conversationId,
        userMessage,
        'user',
        { step: state.step, phone }
      );
    }

    // Ejecutar el workflow
    const graph = createTicketGraph();
    const config = {
      recursionLimit: 10
    };
    state.sessionId = sessionId;
    state.messageIdactual = messageId;
    const result = await graph.invoke(state, config);
    if (result.lastResponse === '#REPLICA#') {
      sessions.set(sessionId, { state: result, conversationId });
      return result.lastResponse;
    }



    // Actualizar usuario en la conversación si se identificó
    if (result.userId && !state.userId) {
      await conversationService.updateConversationUser(conversationId, result.userId);
    }

    // Guardar estado actualizado
    await conversationService.saveConversationState(conversationId, result);

    // Actualizar en memoria
    sessions.set(sessionId, { state: result, conversationId });

    // Si hay respuesta, agregarla al historial y retornarla
    if (result.lastResponse) {
      result.conversationHistory.push({
        assistant: result.lastResponse,
        timestamp: new Date().toISOString()
      });

      // Guardar respuesta del asistente en BD
      await conversationService.saveMessage(
        conversationId,
        result.lastResponse,
        'assistant',
        { step: result.step }
      );

      // Si se completó el proceso y se creó un ticket
      if (result.step === STEPS.SAVETICKET && result.ticketId) {
        await conversationService.completeConversation(conversationId, result.ticketId);
      }

      logger.info('Respuesta generada', { step: result.step });
      return result.lastResponse;
    }

    logger.warn('No se generó respuesta');
    return 'Lo siento, hubo un problema procesando tu solicitud.';

  } catch (error) {
    logger.error('Error procesando mensaje:', error);

    if (error.name === 'GraphRecursionError') {
      sessions.delete(sessionId);
      return 'Lo siento, hubo un problema con la conversación. Por favor, comencemos de nuevo. ¿Cuál es tu correo electrónico?';
    }

    return 'Lo siento, hubo un error interno. Por favor, inténtalo de nuevo.';
  }
}

/**
 * Obtiene información de las sesiones activas
 * @returns {Object} - Información de sesiones
 */
export function getSessionsInfo() {
  const sessionInfo = Array.from(sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    conversationId: data.conversationId,
    step: data.state.step,
    userEmail: data.state.userEmail,
    historyLength: data.state.conversationHistory.length,
    lastActivity: data.state.conversationHistory.length > 0
      ? data.state.conversationHistory[data.state.conversationHistory.length - 1].timestamp
      : null
  }));

  return {
    activeSessions: sessions.size,
    sessions: sessionInfo
  };
}

/**
 * Limpia sesiones inactivas (más de 30 minutos)
 */
export async function cleanupOldConversations() {

   await conversationService.cleanupOldConversations();
}
export async function cleanupInactiveSessions() {
  const now = new Date();
  const maxInactiveTime = 30 * 60 * 1000; // 30 minutos

  let cleaned = 0;

  for (const [sessionId, data] of sessions.entries()) {
    const state = data.state;

    if (state.conversationHistory.length === 0) continue;

    const lastActivity = new Date(
      state.conversationHistory[state.conversationHistory.length - 1].timestamp
    );

    if (now - lastActivity > maxInactiveTime) {
      // Guardar estado final antes de limpiar
      try {
        await conversationService.saveConversationState(data.conversationId, state);
      } catch (error) {
        logger.error('Error guardando estado final:', error);
      }

      sessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Sesiones inactivas limpiadas: ${cleaned}`);
  }
}

/**
 * Obtiene estadísticas de conversaciones
 * @param {string} period - 'day', 'week', 'month'
 * @returns {Promise<Object>} - Estadísticas
 */
export async function getConversationStats(period = 'day') {
  const now = new Date();
  let fromDate = new Date();

  switch (period) {
    case 'week':
      fromDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      fromDate.setMonth(now.getMonth() - 1);
      break;
    default: // day
      fromDate.setDate(now.getDate() - 1);
  }

  return await conversationService.getConversationStats(fromDate, now);
}

// Limpiar sesiones inactivas cada 10 minutos
setInterval(cleanupInactiveSessions, 10 * 60 * 1000);

// Limpiar conversaciones antiguas de la BD cada día
setInterval(async () => {
  try {
    const deleted = await conversationService.cleanupOldConversations(30);
    if (deleted > 0) {
      logger.info(`Conversaciones antiguas eliminadas de BD: ${deleted}`);
    }
  } catch (error) {
    logger.error('Error limpiando conversaciones antiguas:', error);
  }
}, 24 * 60 * 60 * 1000);