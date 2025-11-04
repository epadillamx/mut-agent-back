
import { processMessage } from './controllers/chat.controller.js';

async function test() {
    const from = '+1234567890';
    const message_full = 'si';
    const messageId = 'msg-001abcbf65';
    const response = await processMessage(from, message_full, messageId);
    console.log('Response from assistant:');
    console.log( response);
    process.exit(0);
}

test();
// Procesar el mensaje del usuario
