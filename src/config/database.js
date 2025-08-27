import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Crear pool de conexiones
export const dbPool = new Pool({
  user: process.env.DB_USER || 'daynet',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sisgest',
  password: process.env.DB_PASSWORD || 'daynet.p25202%',
  port: process.env.DB_PORT || 5432,
  /*ssl: process.env.DB_SSL === 'false' ? false : {
    rejectUnauthorized: false
  }*/
});

// Verificar conexión
export async function checkDatabaseStatus() {
  try {
    const result = await dbPool.query('SELECT 1');
    return 'ok';
  } catch (error) {
    console.error('Error de conexión a BD:', error);
    return 'error';
  }
}

// Cerrar conexión
export async function closeDatabaseConnection() {
  await dbPool.end();
  console.log('✅ Pool de base de datos cerrado');
}