import { test, describe } from 'node:test';
import assert from 'node:assert';
import { processMessage } from '../controllers/chat.controller.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const number = uuidv4().substring(0, 18)

describe('Chat Controller Tests', () => {

    test('conversación completa flujo 2', async () => {
        const conversationLog = [];

        // Mensaje 1: Saludo
        let message = 'Buenas tardes';
        const messageId = uuidv4();
        const response1 = await processMessage(number, message, messageId);
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(typeof response1 === 'string', 'Debe recibir respuesta al saludo');
        conversationLog.push({ user: message, agente: response1 });

        logger.warn(JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));
        logger.warn(response1)


        // Mensaje 2: Nombre
        message = 'Eduardo Padilla , epadilla@gamil.com , hay un incendio en el pasilllo y de la basura';
        const messageId2 = uuidv4();
        const response2 = await processMessage(number, message, messageId2);
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(typeof response2 === 'string', 'Debe recibir respuesta al proporcionar nombre');
        conversationLog.push({ user: message, agente: response2 });

        logger.warn(JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));
        logger.warn(response2)

        // Mensaje 3: Local
        message = 'Es Adidas';
        const messageId3 = uuidv4();
        const response3 = await processMessage(number, message, messageId3);
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(typeof response3 === 'string', 'Debe recibir respuesta al proporcionar local');
        conversationLog.push({ user: message, agente: response3 });

        logger.warn(JSON.stringify({
            user: message,
            agente: "ok"
        }, null, 2));
        logger.warn(response3)


        



        // Validaciones adicionales del flujo completo
        assert.strictEqual(conversationLog.length, 7, 'Debe tener exactamente 7 intercambios');

        // Verificar que todas las respuestas son strings no vacíos
        conversationLog.forEach((exchange, index) => {
            assert.ok(typeof exchange.agente === 'string' && exchange.agente.length > 0,
                `Respuesta ${index + 1} debe ser un string no vacío`);
        });
        logger.warn("Test completado - Flujo de conversación exitoso");
    });


});