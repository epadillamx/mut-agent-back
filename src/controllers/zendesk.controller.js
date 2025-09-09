// src/controllers/zendesk.controller.js
import logger from '../utils/logger.js';
import {
  userExistsByEmail,
  getUserIdByEmail,
  createZendeskUser,
  selectGroupId,
  getGroupName,
  buildTicketData,
  createZendeskTicket,
  translatePriority,
  translateType,
  findLocalUserIdByEmail,
  insertLogTicket,
} from '../services/zendesk.service.js';


//FUNCION PRINCIPAL QUE MEDIANTE LAS FUNCIONES DEL SERVICE CREA EL TICKET EN ZENDESK Y TAMBIEN EL LOG EN LA BASE DE DATOS
export async function zendeskTest(
  email,
  nombre,
  apellido,
  tag,
  tema,
  cuerpo,
  useProdGroup = false,
  // nuevos para log_ticket:
  numeroContrato = null,
  locatarioId = null,
  // toggle para activar/desactivar el insert en la base de datos
  persistLog = true,
) {
  logger.info('Procesando creación de ticket', { email, tag, useProdGroup });

  try {
    // 1) Resolver requesterId usando las funciones principales
    const exists = await userExistsByEmail(email);
    let requesterId = exists ? await getUserIdByEmail(email) : null;

    if (!requesterId) {
      requesterId = await createZendeskUser({ email, nombre, apellido });
    }

    // 2) Seleccionar grupo por bandera (false=DEV, true=PROD)
    const groupId = selectGroupId(useProdGroup);
    const groupName = getGroupName(useProdGroup);

    // 3) Construir payload del ticket
    const ticketData = buildTicketData({
      requesterId,
      subject: tema,
      body: cuerpo,
      tag,
      groupId,
    });

    // 4) Crear ticket en Zendesk
    const created = await createZendeskTicket(ticketData);
    const ticketId = created?.id ?? null;

    // 5) (Opcional) Guardar en log_ticket
    // userId local (puede ser null si no existe en c_user_locatario)
    const localUserId = await findLocalUserIdByEmail(email);

    const prioridadEs = translatePriority(created?.priority);
    const tipoEs = translateType(created?.type);
    const subject = created?.raw_subject ?? tema ?? null;

    let logId = null;
    try {
      logId = await insertLogTicket({
        subject,
        prioridadTicket: prioridadEs,
        tipoTicket: tipoEs,
        zendeskId: ticketId,
        locatarioId: locatarioId ?? null,
        contratoId: numeroContrato ?? null,
        grupoTicket: groupName,
        userId: localUserId,   // puede ser null si no existe relación
        enabled: persistLog,
      });
    } catch (e) {
      // No romper respuesta si el log falla: solo registramos
      logger.error('Fallo insert log_ticket (no crítico)', { error: e?.message });
    }

    return { ok: true, userId: requesterId, ticketId, logId };
  } catch (err) {
    logger.error('Error creando ticket Zendesk', { err: err?.message });
    return {
      ok: false,
      error: err?.message || 'Lo siento, hubo un error interno. Por favor, inténtalo de nuevo.',
    };
  }
}
