
import logger from '../utils/logger.js';
import { getClasificacionsql } from '../services/database.service.js';
import { invokeClaude } from '../services/claude.service.js';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';

export async function getClasificacion(state) {
    try {
        const clasificacion = await getClasificacionsql();
        const USER = PROMPT_TEMPLATES.processLoClasificacion.user
            .replaceAll('{message}', state.incidencia)
            .replaceAll('{availableLocations}', JSON.stringify(clasificacion));
        const response = await invokeClaude(USER, PROMPT_TEMPLATES.processLoClasificacion.system);
        return JSON.parse(response);
    } catch (error) {
        logger.error('Error verificacionPhoneNode :', error);
        return null
    }
}