import express from 'express';
import { processMessage, getSessionsInfo,cleanupInactiveSessions, cleanupOldConversations } from './controllers/chat.controller.js';
import { checkDatabaseStatus, closeDatabaseConnection } from './config/database.js';
import { checkBedrockStatus } from './config/bedrock.js';
import dotenv from 'dotenv';
import { sendMessage, MarkStatusMessage } from './controllers/send.message.js';
import { accumulateMessage } from './services/acumulacion.js';
import { zendeskTest } from './controllers/zendesk.controller.js';

dotenv.config();

const app = express();

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS manual (evitamos el paquete cors por si causa conflicto)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Middleware de logging simple
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Webhook GET - Verificación de WhatsApp
app.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    console.log('Verificación webhook:', { mode, token, challenge, VERIFY_TOKEN });

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        console.log('❌ Verificación fallida. Tokens no coinciden.');
        return res.status(403).send('Forbidden');
      }
    } else {
      console.log('❌ Faltan parámetros mode o token');
      return res.status(400).send('Bad Request');
    }
  } catch (error) {
    console.error('Error en webhook verification:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Webhook POST - Recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Verificar que es una notificación de WhatsApp
    if (body.object === 'whatsapp_business_account') {
      let response = '';
      let from = ''



      // Procesar todos los mensajes
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {

          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              from = message.from;
              const messageType = message.type;
              if (messageType === 'text' && message.text) {
                const messageBody = message.text.body;
                const messageId = message.id;
                try {
                  MarkStatusMessage(messageId);
                  const messagePromise = accumulateMessage(from, messageBody);
                  if (messagePromise) {
                    messagePromise
                      .then(message_full => {
                        if (message_full != null) {
                          
                          //console.log(`✅ ${from}:`, message_full);
                          processMessage(from, message_full, messageId)
                            .then(response => {
                              if (response !== '#REPLICA#') {
                                //isSendMessage = true;
                                sendMessage(from, response);
                              }
                            })
                            .catch(err => console.error('Error procesando:', err));
                        }
                      })
                      .catch(error => {
                        console.error('❌ Error en acumulación:', error);
                      });
                  }
                  /*response = await processMessage(from, messageBody, messageId);
                  if (response !== '#REPLICA#') {
                    isSendMessage = true;
                  }*/
                } catch (processError) {
                  console.error('Error procesando mensaje:', processError);
                  response = 'Lo siento, hubo un error interno. Por favor, inténtalo de nuevo.';
                }
              }
            }
          }
        }
      }

      //if (isSendMessage) {
      //  await sendMessage(from, response);
      //}
      return res.status(200).json({ status: 'ok' });

    } else {
      return res.status(200).json({ status: 'ignored' });
    }

  } catch (error) {
    console.error('Error en webhookChat:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Health check
app.get('/healthcheck', async (req, res) => {
  try {
    const [dbStatus, bedrockStatus] = await Promise.all([
      checkDatabaseStatus(),
      checkBedrockStatus()
    ]);

    res.status(200).json({
      status: 'ok',
      database_status: dbStatus,
      bedrock_status: bedrockStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en healthcheck:', error);
    res.status(500).json({
      status: 'error',
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// Chat endpoint para testing
app.post('/chat', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        error: 'phone y message son requeridos'
      });
    }

    console.log('Request de chat recibido', { phone, message });
    const response = await processMessage(phone.trim(), message.trim());

    res.status(200).json({ response });

  } catch (error) {
    console.error('Error procesando chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Debug sessions
app.get('/debug/sessions', (req, res) => {
  try {
    const sessionInfo = getSessionsInfo();
    res.status(200).json(sessionInfo);
  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Debug sessions
app.get('/clean', (req, res) => {
  try {
    cleanupInactiveSessions();
    cleanupOldConversations();
    res.status(200).json("OK");
  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.post('/zendesk-test', async (req, res) => {
  try {
    const {
      email: rawEmail,
      nombre,
      apellido,
      tag,
      tema,
      cuerpo,
      prod,             // true => producción; false => desarrollo
      numeroContrato,   // nuevo
      locatarioId,      // nuevo
      log,              // opcional: true/false para activar/desactivar insert en log_ticket
    } = req.body ?? {};

    const email = String(rawEmail ?? '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'email es requerido en el body' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'email no tiene un formato válido' });
    }

    const useProdGroup =
      prod === true || String(prod).toLowerCase() === 'true' || String(prod) === '1';

    // Toggle de persistencia (defaults: true, o toma env si quieres)
    const persistLog =
      log === undefined
        ? true
        : (log === true || String(log).toLowerCase() === 'true' || String(log) === '1');

    const respuesta = await zendeskTest(
      email,
      nombre,
      apellido,
      tag,
      tema,
      cuerpo,
      useProdGroup,
      numeroContrato,
      locatarioId,
      persistLog
    );

    return res.status(200).json(respuesta);
  } catch (error) {
    console.error('Error en POST /zendesk-test:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});



// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/healthcheck`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
  console.log(`🔍 Debug sessions: http://localhost:${PORT}/debug/sessions`);
  console.log(`🔗 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`🔗 clean: http://localhost:${PORT}/clean`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');

  server.close(() => {
    console.log('✅ Servidor HTTP cerrado');
  });

  try {
    await closeDatabaseConnection();
  } catch (error) {
    console.error('Error cerrando conexión DB:', error);
  }

  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', { reason });
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
  process.exit(1);
});