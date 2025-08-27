import { test, describe } from 'node:test';
import assert from 'node:assert';
import { processMessage } from '../controllers/chat.controller.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const number = uuidv4().substring(0, 18)

describe('Chat Controller Tests', () => {

    test('conversación completa flujo 1', async () => {
        const conversationLog = [];

        // Mensaje 1: Saludo
        let message = 'me llamo eduardo padilla, epadilla@com.com, hay una incendio  en el paso se esta tirando el agua me urge , estoy localizado en el local Adidas';
        const response1 = await processMessage(number, message);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response1 === 'string', 'Debe recibir respuesta al saludo');
        conversationLog.push({ user: message, agente: response1 });

        logger.warn("Test - Conversación:", JSON.stringify({
            user: message,
            agente: response1
        }, null, 2));


        // Mensaje 7: Confirmación
        message = 'Todos los datos son correctos';
        const response7 = await processMessage(number, message);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response7 === 'string', 'Debe recibir respuesta de confirmación');
        conversationLog.push({ user: message, agente: response7 });

        logger.warn("Test - Conversación:", JSON.stringify({
            user: message,
            agente: response7
        }, null, 2));

        // Validaciones adicionales del flujo completo
        assert.strictEqual(conversationLog.length, 2, 'Debe tener exactamente 2 intercambios');

        // Verificar que todas las respuestas son strings no vacíos
        conversationLog.forEach((exchange, index) => {
            assert.ok(typeof exchange.agente === 'string' && exchange.agente.length > 0,
                `Respuesta ${index + 1} debe ser un string no vacío`);
        });
        logger.warn("Test completado - Flujo de conversación exitoso");
    });
    

});