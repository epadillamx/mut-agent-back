
import logger from '../utils/logger.js';
import { getClasificacionsql } from '../services/database.service.js';
import { invokeClaude } from '../services/claude.service.js';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';
import Handlebars from 'handlebars';


export async function getClasificacion(state) {
    try {
        const clasificacion = await getClasificacionsql();
        const availableLocations = JSON.stringify(clasificacion);
        const message = state.incidencia;
        const template = Handlebars.compile(PROMPT_TEMPLATES.processLoClasificacion.user);
        const USER = template({ message, availableLocations });
        const response = await invokeClaude(USER, PROMPT_TEMPLATES.processLoClasificacion.system);
        return JSON.parse(response);
    } catch (error) {
        logger.error('Error verificacionPhoneNode :', error);
        return null
    }
}

export async function getClasificacionzendesk(incidencia) {
    try {

        const template = Handlebars.compile(PROMPT_TEMPLATES.validateconZendesk.user);
        const USER = template({ incidencia });
        logger.debug("=====PROMPT PARA ZENDESK=====", USER);
        const response = await invokeClaude(USER, PROMPT_TEMPLATES.validateconZendesk.system);
        return JSON.parse(response);
    } catch (error) {
        logger.error('Error verificacionPhoneNode :', error);
        return null
    }
}