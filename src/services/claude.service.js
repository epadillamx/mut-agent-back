import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockRuntimeClient } from '../config/bedrock.js';

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

/**
 * Invoca el modelo Claude 3 Sonnet
 * @param {string} prompt - El prompt para Claude
 * @param {string} systemMessage - Mensaje del sistema (opcional)
 * @returns {Promise<string>} - La respuesta de Claude
 */
export async function invokeClaude(prompt, systemMessage = '') {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    system: systemMessage,
    messages: [{
      role: 'user',
      content: prompt
    }]
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify(payload)
  });

  try {
    const response = await bedrockRuntimeClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Error invocando Claude:', error);
    throw error;
  }
}