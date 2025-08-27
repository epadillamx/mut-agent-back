
import { dbPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { prepareStateForDB } from '../utils/utils.js';

/**
 * Crea una nueva conversación en la base de datos
 * @param {string} sessionId - ID de la sesión
 * @param {number} userId - ID del usuario (opcional)
 * @returns {Promise<number>} - ID de la conversación creada
 */
export async function createConversation(sessionId, userId = null, phone) {
  try {
    const query = `
      INSERT INTO whatsapp_conversations (session_id, user_id, started_at,phone)
      VALUES ($1, $2, NOW(),$3)
      RETURNING id
    `;
    const result = await dbPool.query(query, [sessionId, userId, phone]);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error creando conversación:', error);
    throw error;
  }
}

/**
 * Actualiza el user_id de una conversación existente
 * @param {number} conversationId - ID de la conversación
 * @param {number} userId - ID del usuario
 */
export async function updateConversationUser(conversationId, userId) {
  try {
    const query = `
      UPDATE whatsapp_conversations 
      SET user_id = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await dbPool.query(query, [userId, conversationId]);
  } catch (error) {
    logger.error('Error actualizando usuario de conversación:', error);
    throw error;
  }
}

/**
 * Guarda un mensaje en la conversación
 * @param {number} conversationId - ID de la conversación
 * @param {string} message - Mensaje
 * @param {string} role - 'user' o 'assistant'
 * @param {Object} metadata - Metadata adicional (step, etc)
 * @returns {Promise<number>} - ID del mensaje creado
 */
export async function saveMessage(conversationId, message, role, metadata = {}) {
  try {
    const query = `
      INSERT INTO whatsapp_conversation_messages (conversation_id, message, role, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `;
    const result = await dbPool.query(query, [
      conversationId,
      message,
      role,
      JSON.stringify(metadata)
    ]);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error guardando mensaje:', error);
    throw error;
  }
}

/**
 * Guarda el estado completo de una conversación
 * @param {number} conversationId - ID de la conversación
 * @param {Object} state - Estado completo del workflow
 */
export async function saveConversationState(conversationId, state) {
  try {



    const query = `
      INSERT INTO whatsapp_conversation_states (conversation_id, state, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (conversation_id) 
      DO UPDATE SET state = $2, updated_at = NOW()
    `;
    await dbPool.query(query, [conversationId, prepareStateForDB(state)]);
  } catch (error) {
    logger.error('Error guardando estado de conversación:', error);
    throw error;
  }
}

/**
 * Recupera una conversación por session_id
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object|null>} - Conversación con sus mensajes
 */
export async function getConversationBySession(sessionId) {
  try {
    // Obtener la conversación
    const convQuery = `
      SELECT c.*, u.nombre as user_name, u.email as user_email
      FROM whatsapp_conversations c
      LEFT JOIN whatsapp_usuarios u ON c.user_id = u.id
      WHERE c.session_id = $1
      ORDER BY c.created_at DESC
      LIMIT 1
    `;
    const convResult = await dbPool.query(convQuery, [sessionId]);

    if (convResult.rows.length === 0) {
      return null;
    }

    const conversation = convResult.rows[0];

    // Obtener los mensajes
    const msgQuery = `
      SELECT id, message, role, metadata, created_at
      FROM whatsapp_conversation_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;
    const msgResult = await dbPool.query(msgQuery, [conversation.id]);

    // Obtener el último estado
    const stateQuery = `
      SELECT state, updated_at
      FROM whatsapp_conversation_states
      WHERE conversation_id = $1
    `;
    const stateResult = await dbPool.query(stateQuery, [conversation.id]);

    return {
      ...conversation,
      messages: msgResult.rows,
      lastState: stateResult.rows[0] || null
    };
  } catch (error) {
    logger.error('Error recuperando conversación:', error);
    throw error;
  }
}

/**
 * Marca una conversación como completada
 * @param {number} conversationId - ID de la conversación
 * @param {number} ticketId - ID del ticket creado (opcional)
 */
export async function completeConversation(conversationId, ticketId = null) {
  try {
    const query = `
      UPDATE whatsapp_conversations 
      SET completed_at = NOW(), 
          ticket_id = $2,
          updated_at = NOW()
      WHERE id = $1
    `;
    await dbPool.query(query, [conversationId, ticketId]);
  } catch (error) {
    logger.error('Error completando conversación:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de conversaciones
 * @param {Date} fromDate - Fecha desde
 * @param {Date} toDate - Fecha hasta
 * @returns {Promise<Object>} - Estadísticas
 */
export async function getConversationStats(fromDate, toDate) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(completed_at) as completed_conversations,
        COUNT(ticket_id) as tickets_created,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60)::NUMERIC(10,2) as avg_duration_minutes
      FROM whatsapp_conversations
      WHERE started_at BETWEEN $1 AND $2
    `;
    const result = await dbPool.query(query, [fromDate, toDate]);
    return result.rows[0];
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * Limpia conversaciones antiguas sin completar
 * @param {number} daysOld - Días de antigüedad
 * @returns {Promise<number>} - Número de conversaciones eliminadas
 */
export async function cleanupDeleteOldConversations(daysOld = 30) {
  try {
    const query = `
      DELETE FROM whatsapp_conversations 
      WHERE completed_at IS NULL 
      AND started_at < NOW() - INTERVAL '$1 days'
      RETURNING id
    `;
    const result = await dbPool.query(query, [daysOld]);
    return result.rowCount;
  } catch (error) {
    logger.error('Error limpiando conversaciones antiguas:', error);
    throw error;
  }
}

export async function cleanupOldConversations() {
  try {

    const query = `
      UPDATE whatsapp_conversations 
      SET completed_at = NOW(),updated_at = NOW()
      WHERE  completed_at IS NULL
      AND started_at < NOW() - INTERVAL '1 days'
    `;
    await dbPool.query(query);
  } catch (error) {
    logger.error('Error limpiando conversaciones antiguas:', error);
    throw error;
  }
}