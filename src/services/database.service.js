import { dbPool } from '../config/database.js';
import logger from '../utils/logger.js';



export async function checkSessionPhone(phone) {
  try {
    const query = `
      SELECT session_id
      FROM whatsapp_conversations
      WHERE phone = $1 and completed_at is null  order by created_at desc limit 1;
    `;

    const result = await dbPool.query(query, [phone]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error verificando usuario:', error);
    throw error;
  }
}
/**
 * Verifica si un usuario existe en la base de datos
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} - Datos del usuario o null
 */

export async function checkUserPhone(phone) {
  try {
    const query = `
      SELECT u.id, u.nombre, u.email, u.nombre_local,u.local_id,u.fractal_code
      FROM whatsapp_usuarios u
      WHERE u.phone = $1
    `;

    const result = await dbPool.query(query, [phone]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error verificando usuario:', error);
    throw error;
  }
}



export async function checkUserDb(email) {
  try {
    const query = `
      SELECT u.id, u.nombre, u.email, u.nombre_local,u.local_id
      FROM whatsapp_usuarios u
      WHERE u.email = $1
    `;
    const result = await dbPool.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error verificando usuario:', error);
    throw error;
  }
}

/**
 * Valida una ubicación en la base de datos
 * @param {string} location - Nombre de la ubicación
 * @returns {Promise<Object>} - Objeto con exact y locations
 */
export async function validateLocationDb(location) {
  try {
    // Búsqueda exacta primero
    //let query = 'SELECT id, nombre_local FROM locales WHERE nombre_local ILIKE $1';
    let query = `select l."nombreComercial" as nombre,
                      ul."fracttalCode"   as fractal_code,
                      l.id                as locatarioId,
                      CASE
                          WHEN c."centroComercial" = 'OFICINAS' THEN 'Oficina'
                          ELSE 'Local'
                          END             AS tipo
               from locatario l
                        inner join contrato c on l.id = c."locatarioId"
                        inner join unidad_locativa ul on ul."codigoLocal" = c."unidadLocativaCodigoLocal"
               where l."nombreComercial" ILIKE $1
                 and c.status = 1
                 and ul."fracttalCode" is not null
                 and c."centroComercial" in ('RETAIL', 'OFICINAS', 'RETAILNOVENTAS')`;


    let result = await dbPool.query(query, [`%${location.trim()}%`]);

    if (result.rows.length > 0) {
      return { exact: true, locations: result.rows };
    }

    return { exact: false, locations: result.rows };
  } catch (error) {
    logger.error('Error validando ubicación:', error);
    throw error;
  }
}


export async function getClasificacionsql() {
  try {
    // Búsqueda exacta primero
    let query = ` WITH
                    nivel_3 AS (
                        SELECT id, nombre, descripcion, "padreId"
                        FROM fracttal_clasificacion
                        WHERE nivel = 3 AND status = 1
                    ),
                    nivel_2 AS (
                        SELECT id, nombre, "padreId"
                        FROM fracttal_clasificacion
                        WHERE nivel = 2 AND status = 1
                    ),
                    nivel_1 AS (
                        SELECT id, nombre, "padreId"
                        FROM fracttal_clasificacion
                        WHERE nivel = 1 AND status = 1
                    )
                    SELECT
                        n3.nombre AS nombre_nivel_3,
                        n3.descripcion AS descripcion_nivel_3,
                        n2.nombre AS nombre_nivel_2,
                        n1.nombre AS nombre_nivel_1
                    FROM
                        nivel_3 n3
                        INNER JOIN nivel_2 n2 ON n3."padreId" = n2.id
                        INNER JOIN nivel_1 n1 ON n2."padreId" = n1.id
                    ORDER BY
                        n1.nombre, n2.nombre, n3.nombre;`;
    let result = await dbPool.query(query);
    return JSON.stringify(result.rows);
  } catch (error) {
    logger.error('Error obteniendo clasificaciones:', error);
    throw error;
  }
}


export async function createTicketDb(state, idfracttal,estado) {
  try {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      let userId = state.userId;

      // Si es usuario nuevo, crearlo primero
      if (state.userNew && !userId) {
        const insertUserQuery = `
            INSERT INTO whatsapp_usuarios (nombre, email, local_id, phone,nombre_local,fractal_code)
            VALUES ($1, $2, $3, $4,$5,$6)
            RETURNING id
          `;
        const userResult = await client.query(insertUserQuery, [
          state.userName,
          state.userEmail,
          state.localId,
          state.userPhone,
          state.userLocal,
          state.fractal_code
        ]);
        userId = userResult.rows[0].id;
      } else {
        const insertUserQuery = `
            UPDATE whatsapp_usuarios SET nombre=$1, email=$2, local_id=$3, phone=$4,nombre_local=$5,fractal_code=$6 where id=$7
          `;
         await client.query(insertUserQuery, [
          state.userName,
          state.userEmail,
          state.localId,
          state.userPhone,
          state.userLocal,
          state.fractal_code,
          userId
        ]);
      }

      // Crear el ticket
      const insertTicketQuery = `
          INSERT INTO whatsapp_tickets (user_id, descripcion, urgencia, categoria,idfracttal,estado)
          VALUES ($1, $2, $3, $4,$5,$6)
          RETURNING id
        `;
      const ticketResult = await client.query(insertTicketQuery, [
        userId,
        state.incidencia,
        state.isUrgente,
        state.clasificacion,
        idfracttal,
        estado
      ]);


      const queryUpdate = `
      UPDATE whatsapp_conversations 
      SET user_id = $1, updated_at = NOW(), completed_at = NOW(),ticket_id=$2
      WHERE session_id = $3
    `;
      await client.query(queryUpdate, [
        userId,
        ticketResult.rows[0].id,
        state.sessionId
      ]);

      await client.query('COMMIT');
      return ticketResult.rows[0].id;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creando ticket:', error);
    throw error;
  }
}