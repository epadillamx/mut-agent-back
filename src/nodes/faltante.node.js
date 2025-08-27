import { invokeClaude } from '../services/claude.service.js';
import { STEPS, TIPO_ERROR } from '../graph/state.js';
import logger from '../utils/logger.js';
import { END } from '@langchain/langgraph';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';
import Handlebars from 'handlebars';

/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function faltanteNode(state) {

  try {
    logger.warn("=====NODO faltanteNode=====")

    logger.debug("userName", state.userName);
    logger.debug("userEmail", state.userEmail);
    logger.debug("userLocal", state.userLocal);
    logger.debug("incidencia", state.incidencia);
    logger.debug("isUrgente", state.isUrgente);
    logger.debug("state.tipo_error", state.tipo_error);


    //const { conversationHistory, ...newState } = state;
    //logger.debug(JSON.stringify(newState, null, 2));
    if (state.tipo_error === TIPO_ERROR.DOBLE || state.tipo_error === TIPO_ERROR.DOBLE_FALLO) {
      logger.debug("************ 1 *******************");

      const mensaje = state.availableLocations
        .map((loc, index) => `${index + 1}. ${loc.nombre} - ${loc.tipo}`)
        .join('\n');

      const template = Handlebars.compile(PROMPT_TEMPLATES.errorDoble.user);
      const USER = template({ mensaje });
      const response = await invokeClaude(USER, PROMPT_TEMPLATES.errorDoble.system);

      return {
        ...state,
        step: END,
        lastResponse: response
      };

    }
    if (state.tipo_error === TIPO_ERROR.NOMBRE_LOCAL_ERRONEO) {
      logger.debug("************ 2 *******************");
      const hasLocal = 'EL LOCAL "' + state.userLocal + '" no se encuentra registrado en el sistema'

      const template = Handlebars.compile(PROMPT_TEMPLATES.localIncorrecto.user);
      const USER = template({ hasLocal });
      const response = await invokeClaude(USER, PROMPT_TEMPLATES.localIncorrecto.system);
      state.userLocal = '';
      return {
        ...state,
        step: END,
        laststep: STEPS.FALTANTE,
        lastResponse: response
      };
    }

    //Clasificar Incidencia
    let type = 'Incidencia';
    if (state.incidencia.length != 0) {
      logger.debug("************ 3 *******************");
      logger.debug(state.incidencia);
      const templateClass = Handlebars.compile(PROMPT_TEMPLATES.clasificaTexto.user);
      const mensaje = state.incidencia;
      const USERCLASS = templateClass({ mensaje });
      const responseclass = await invokeClaude(USERCLASS, PROMPT_TEMPLATES.clasificaTexto.system);
      const result = JSON.parse(responseclass);
      if (result.isOtro) {
        logger.debug("************ 4 *******************");
        logger.debug(result.message);
        return {
          ...state,
          step: END,
          incidencia: '',
          laststep: STEPS.FALTANTE,
          lastResponse: result.message
        };
      }

      if (result.isOperativa) {
        type = 'Operativa';
      }
    }



    const hasName = state.userName === '' ? 'DATO VACIO' : state.userName ?? 'DATO VACIO';
    const hasEmail = state.userEmail === '' ? 'DATO VACIO' : state.userEmail ?? 'DATO VACIO';
    const hasIncidencia = state.incidencia === '' ? 'DATO VACIO' : state.incidencia ?? 'DATO VACIO';
    const hasLocal = state.userLocal === '' ? 'DATO VACIO' : state.userLocal ?? 'DATO VACIO';
    let mesaggeWolcome = "";
    if (state.conversationHistory.length == 1) {
      logger.debug("************ 5 *******************");
      logger.debug("AGREGAR MENSAJE DE BIENBENIDO");
      mesaggeWolcome = 'Escribe un mensaje de bienvenidad mensionado su nombre ' + state.userName + 'y pidele amablemente que complete su información'
    }


    const template = Handlebars.compile(PROMPT_TEMPLATES.faltante.user);
    const USER = template({ hasName, hasEmail, hasIncidencia, hasLocal, mesaggeWolcome, type });

    const response = await invokeClaude(USER, PROMPT_TEMPLATES.faltante.system);
    logger.debug("************ 6 *******************");
    return {
      ...state,
      step: END,
      laststep: STEPS.FALTANTE,
      lastResponse: response
    };
  } catch (error) {
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}