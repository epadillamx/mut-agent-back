// src/services/zendesk.service.js
import logger from '../utils/logger.js';
import zendeskClient from '../clients/zendeskClient.js';
import { dbPool } from '../config/database.js';

/* =========================
 * CONSTANTES Y UTILIDADES
 * ========================= */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mapea tags -> tipo de ticket
export const TAGS_POR_TIPO = {
  question: ['Informacion General'],
  incident: [
    'Reclamos',
    'Denuncia de Objetos',
    'Robo',
    'Accidente',
    'Servicios Internos',
    'Sugerencias',
  ],
};

// IDs de grupos (ajusta a tus valores reales)
const GROUPS = {
  dev:  { id: 12461124345101, name: 'test' },
  prod: { id: 17318820134669, name: 'SAC MUT' },
};

function cleanEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}
function isValidEmail(email) {
  return emailRegex.test(cleanEmail(email));
}

/* =========================
 * FUNCIONES DE USUARIO ZENDESK
 * ========================= */

/** Interno: busca y devuelve el objeto usuario o null. */
async function findUserByEmail(email) {
  const clean = cleanEmail(email);
  if (!isValidEmail(clean)) return null;

  // 1) Búsqueda directa (recomendada)
  const bySearch = await zendeskClient.users
    .search({ query: `email:${clean}` })
    .catch(() => null);
  if (Array.isArray(bySearch) && bySearch.length > 0) return bySearch[0];

  // 2) Fallback: listar y filtrar
  const all = await zendeskClient.users.list().catch(() => null);
  if (Array.isArray(all)) {
    return all.find(u => String(u.email ?? '').toLowerCase() === clean) ?? null;
  }
  return null;
}

/** 1) Verifica si existe un usuario (boolean). */
export async function userExistsByEmail(email) {
  try {
    const user = await findUserByEmail(email);
    return Boolean(user?.id);
  } catch (err) {
    logger.error('userExistsByEmail error', { email: cleanEmail(email), err: err?.message });
    return false;
  }
}

/** 2) Obtiene el ID de usuario por email (o null si no existe). */
export async function getUserIdByEmail(email) {
  try {
    const user = await findUserByEmail(email);
    return user?.id ?? null;
  } catch (err) {
    logger.error('getUserIdByEmail error', { email: cleanEmail(email), err: err?.message });
    return null;
  }
}

/** 3) Crea un end-user y retorna su ID. */
export async function createZendeskUser({ email, nombre, apellido }) {
  const clean = cleanEmail(email);
  if (!isValidEmail(clean)) throw new Error('Email inválido');

  const name = [nombre, apellido].filter(Boolean).join(' ').trim() || clean;

  const created = await zendeskClient.users.create({
    user: {
      name,
      email: clean,
      role: 'end-user',
    },
  });

  const id = created?.id ?? created?.user?.id;
  if (!id) throw new Error('Zendesk no devolvió un id de usuario');
  return id;
}

/**
 * 4) Obtiene el ID de Zendesk del usuario: si existe lo usa, si no, lo crea.
 * Retorna siempre el ID o lanza error si falla.
 */
export async function getOrCreateRequesterId({ email, nombre, apellido }) {
  const clean = cleanEmail(email);
  if (!isValidEmail(clean)) throw new Error('Email inválido');

  const exists = await userExistsByEmail(clean);
  if (exists) {
    const id = await getUserIdByEmail(clean);
    if (id != null) return id;

    // Caso raro: existe pero no se obtuvo ID
    logger.warn('Usuario reportado como existente pero sin ID; se intentará crear', { email: clean });
  }
  // No existe o no se pudo recuperar ID → crear
  return await createZendeskUser({ email: clean, nombre, apellido });
}

/* =========================
 * FUNCIONES DE TIPO / GRUPO
 * ========================= */

/** 5) Retorna el tipo (question|incident) a partir de un tag. */
export function resolveTipoFromTag(tag) {
  const t = String(tag ?? '').trim();
  if (!t) throw new Error('Tag requerido');

  if (TAGS_POR_TIPO.question.includes(t)) return 'question';
  if (TAGS_POR_TIPO.incident.includes(t)) return 'incident';

  throw new Error(`Tag desconocido: "${t}"`);
}

/**
 * 6) Devuelve el group_id según bandera:
 *    useProdGroup = false -> DEV; true -> PROD
 */
export function selectGroupId(useProdGroup = false) {
  return useProdGroup ? GROUPS.prod.id : GROUPS.dev.id;
}

/** 6.1) Devuelve el nombre del grupo (útil para log) */
export function getGroupName(useProdGroup = false) {
  return useProdGroup ? GROUPS.prod.name : GROUPS.dev.name;
}

/* =========================
 * FUNCIONES DE TICKETS
 * ========================= */

/** Prioridad basada en tipo (ajusta si necesitas más reglas). */
function resolvePrioridadFromTipo(tipo) {
  if (tipo === 'incident') return 'high';
  if (tipo === 'question') return 'low';
  return 'normal';
}

// Normalización de tag: espacios → guion_bajo
export function normalizeTag(tag) {
  return String(tag ?? '').trim().replace(/\s+/g, '_');
}

/**
 * 7) Construye el payload de ticket de Zendesk.
 * Retorna objeto con forma: { ticket: { ... } }
 */
export function buildTicketData({
  requesterId,
  subject,
  body,
  tag,
  groupId,
}) {
  if (!requesterId) throw new Error('requesterId requerido');
  if (!groupId) throw new Error('groupId requerido');

  const tipo = resolveTipoFromTag(tag);
  const priority = resolvePrioridadFromTipo(tipo);
  const normalizedTag = normalizeTag(tag);

  return {
    ticket: {
      type: tipo,
      priority,
      group_id: groupId,
      requester_id: requesterId,
      subject: subject ?? `[${tipo.toUpperCase()}] ${tag}`,
      comment: {
        body: body ?? `Ticket creado automáticamente (${tag})`,
      },
      tags: [normalizedTag],
    },
  };
}

/** Envuelve el callback en Promise para crear el ticket en Zendesk. */
export function createZendeskTicket(ticketData) {
  return new Promise((resolve, reject) => {
    zendeskClient.tickets.create(ticketData, (err, _req, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/* =========================
 * FUNCIONES AUX LOG_TICKET (DB)
 * ========================= */

/** Traducciones para guardar en log_ticket */
export function translatePriority(en) {
  const map = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
  return map[en] || en;
}
export function translateType(en) {
  const map = { question: 'Pregunta', incident: 'Incidente', problem: 'Problema', task: 'Tarea' };
  return map[en] || en;
}

/**
 * Busca el user.id local por email en c_user_locatario → user (puede ser null).
 * Retorna string | null
 */
export async function findLocalUserIdByEmail(email) {
  const clean = cleanEmail(email);
  if (!isValidEmail(clean)) return null;

  try {
    const sql = `
      SELECT u."id" AS "userId"
      FROM "c_user_locatario" cul
      LEFT JOIN "user" u ON u."id" = cul."userId"
      WHERE LOWER(cul."email") = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await dbPool.query(sql, [clean]);
    return rows?.[0]?.userId ?? null;
  } catch (err) {
    logger.error('findLocalUserIdByEmail error', { email: clean, err: err?.message });
    return null;
  }
}

export async function insertLogTicket({
  subject,
  prioridadTicket,
  tipoTicket,
  zendeskId,
  locatarioId,
  contratoId,
  grupoTicket,
  userId,
  enabled = true,
}) {
  if (!enabled) {
    logger.info('insertLogTicket desactivado (enabled=false)');
    return null;
  }

  const sql = `
    INSERT INTO "log_ticket"
      ("subject", "prioridadTicket", "tipoTicket", "zendeskId", "locatarioId", "contratoId", "grupoTicket", "userId")
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING "id"
  `;

  const params = [
    subject ?? null,
    prioridadTicket ?? null,
    tipoTicket ?? null,
    zendeskId ?? null,
    locatarioId ?? null,
    contratoId ?? null,
    grupoTicket ?? null,
    userId ?? null,
  ];

  try {
    const { rows } = await dbPool.query(sql, params);
    const logId = rows?.[0]?.id ?? null;
    logger.info('log_ticket insertado', { logId, zendeskId });
    return logId;
  } catch (err) {
    logger.error('Error insertando en log_ticket', { err: err?.message, zendeskId });
    throw err;
  }
}
