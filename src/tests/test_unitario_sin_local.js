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
        let message = 'me llamo eduardo padilla, epadilla@com.com, hay una incendio  en el paso se esta tirando el agua me urge , estoy localizado en el local Jose cuenvo';
        const response1 = await processMessage(number, message);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response1 === 'string', 'Debe recibir respuesta al saludo');
        conversationLog.push({ user: message, agente: response1 });

        logger.warn("Test - Conversación:", JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));
        logger.warn(response1)

        // Mensaje 7: Confirmación
        message = 'Asi perdon es MIchelas';
        const response2 = await processMessage(number, message);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response2 === 'string', 'Debe recibir respuesta de confirmación');
        conversationLog.push({ user: message, agente: response2 });

        logger.warn("Test - Conversación:", JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));
        logger.warn(response2)

        // Mensaje 7: Confirmación
        message = 'Asi perdon es Adidas';
        const response3 = await processMessage(number, message);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response3 === 'string', 'Debe recibir respuesta de confirmación');
        conversationLog.push({ user: message, agente: response3 });

        logger.warn("Test - Conversación:", JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));
        logger.warn(response3)


        // Mensaje 7: Confirmación
        message = 'Todos los datos son correctos';
        const response4 = await processMessage(number, message);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response4 === 'string', 'Debe recibir respuesta de confirmación');
        conversationLog.push({ user: message, agente: response4 });

        logger.warn("Test - Conversación:", JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));

        logger.warn(response4)

        // Validaciones adicionales del flujo completo
        assert.strictEqual(conversationLog.length, 4, 'Debe tener exactamente 2 intercambios');

        // Verificar que todas las respuestas son strings no vacíos
        conversationLog.forEach((exchange, index) => {
            assert.ok(typeof exchange.agente === 'string' && exchange.agente.length > 0,
                `Respuesta ${index + 1} debe ser un string no vacío`);
        });
        logger.warn("Test completado - Flujo de conversación exitoso");
    });
    

});