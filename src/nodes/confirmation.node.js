import { invokeClaude } from '../services/claude.service.js';
import { STEPS } from '../graph/state.js';
import logger from '../utils/logger.js';
import { END } from '@langchain/langgraph';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';
import Handlebars from 'handlebars';

/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function confirmationNode(state) {

  try {
    logger.warn("=====NODO confirmationNode=====")
    //const { conversationHistory, ...newState } = state;
    //logger.warn(JSON.stringify(newState, null, 2));
    const limpieza = state.userName.replace("NULL", "");
    const hasName = limpieza ?? 'no proporcionado';
    const hasEmail = state.userEmail ?? 'no proporcionado';
    const hasIncidencia = state.incidencia ?? 'no proporcionado';
    const hasLocal = state.userLocal ?? 'no proporcionado';
    state.userName = limpieza

    //Clasificar
    const templateClass = Handlebars.compile(PROMPT_TEMPLATES.clasificaTexto.user);
    const mensaje = state.incidencia;
    const USERCLASS = templateClass({ mensaje });
    const responseclass = await invokeClaude(USERCLASS, PROMPT_TEMPLATES.clasificaTexto.system);
    const result = JSON.parse(responseclass);
    if (result.isOtro) {
      return {
        ...state,
        step: END,
        incidencia: '',
        laststep: STEPS.FALTANTE,
        lastResponse: result.message
      };
    }
    let type = 'Incidencia';
    if (result.isOperativa) {
      type = 'Operativa';
      state.typeclass = 'OPERATIVA'
    }

    let typelocal = 'Local';
    if (hasLocal.toUpperCase().includes('LOCAL')) {
      typelocal = 'Local';
    }
    if (hasLocal.toUpperCase().includes('OFICINA')) {
      typelocal = 'Oficina';
    }
    const template = Handlebars.compile(PROMPT_TEMPLATES.confirmation.user);
    const USER = template({ hasName, hasEmail, hasIncidencia, hasLocal, type, typelocal });
    const response = await invokeClaude(USER, PROMPT_TEMPLATES.confirmation.system);
    return {
      ...state,
      step: END,
      laststep: STEPS.CONFIRMATION,
      lastResponse: response
    };
  } catch (error) {
    state.stepprevious.delete(STEPS.INICIO);
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}