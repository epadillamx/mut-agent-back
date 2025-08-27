import { invokeClaude } from '../services/claude.service.js';
import { STEPS, TIPO_ERROR } from '../graph/state.js';
import logger from '../utils/logger.js';
import { END } from '@langchain/langgraph';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';
import Handlebars from 'handlebars';
import { extraerEmail } from '../utils/utils.js';
/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function orquestadorcambioNode(state) {
  logger.warn("=====NODO orquestadorcambioNode=====")
  //const { conversationHistory, ...newState } = state;
  //logger.warn(JSON.stringify(newState, null, 2));
  try {
    let input = state.conversationHistory[state.conversationHistory.length - 1]?.user || '';
    let updatedate = false;

    //===================== EXRAER NOMBRE
    logger.debug("==EXTRAC CAMBIO NOMBRE==");
    logger.debug("input", input);
    const templatename = Handlebars.compile(PROMPT_TEMPLATES.extractNombre.user);
    const USER_NAME = templatename({ input });
    const response_name = await invokeClaude(USER_NAME, PROMPT_TEMPLATES.extractNombre.system);
    try {
      const resultname = JSON.parse(response_name);
      if (resultname.userName != null) {
        if (state.userName !== resultname.userName) {
          if (resultname.userName !== 'NULL NULL') {
            state.userName = resultname.userName;
            updatedate = true;
          }
        }
      }
    } catch (error) {
      logger.warn("No existe Nombre");
    }
    //=================CAMBIO INCIDENCIA ================
    logger.debug("==CAMBIO INCIDENCIA==");
    logger.debug("input", input);
    const templatecambio = Handlebars.compile(PROMPT_TEMPLATES.extractInfo.user);
    const USER_INCIDENCIA = templatecambio({ input });
    const responseincidencia = await invokeClaude(USER_INCIDENCIA, PROMPT_TEMPLATES.extractInfo.system);
    try {
      const result_incidencia = JSON.parse(responseincidencia);
      logger.debug("extractInfo", JSON.stringify(result_incidencia, null, 2));
      if (result_incidencia.texto != null) {
        if (state.incidencia !== result_incidencia.texto) {
          logger.debug("HAY CAMBIO DE INCIDENCIA");
          state.incidencia = result_incidencia.texto;
          state.isUrgente = result_incidencia.isUrgente;
          state.typeclass = result_incidencia.categoria;
          updatedate = true;
        }
      }
    } catch (error) {
      logger.warn("No existe incidencia");
    }
    //===========CAMBIO EMIAL
    logger.debug("==CAMBIO EMAIL==");
    logger.debug("input", input);
    const extracEmail = extraerEmail(input);
    if (extracEmail.length != 0) {
      if (extracEmail !== state.userEmail) {
        state.userEmail = extracEmail;
        updatedate = true;
      }

    }
    //======LOCAL===========

    logger.debug("BUSCAR LOCAL")
    logger.debug("input", input)
    const templatelocal = Handlebars.compile(PROMPT_TEMPLATES.extractLocal.user);
    const input_mayus = input.toUpperCase();
    const USER_LOCAL = templatelocal({ input_mayus });
    const responselocal = await invokeClaude(USER_LOCAL, PROMPT_TEMPLATES.extractLocal.system);
    try {
      const resultlocal = JSON.parse(responselocal);
      logger.debug("extractLocal", JSON.stringify(resultlocal, null, 2));
      if (resultlocal.userLocal != null) {
        if (resultlocal.userLocal !== state.userLocal) {
          updatedate = true;
          return {
            ...state,
            userLocal: resultlocal.userLocal ?? '',
            step: STEPS.VALIDATE,
            localId: '',
            tipo_error: TIPO_ERROR.LOCAL_CAMBIO,
            laststep: STEPS.ORQUESTADOR_CAMBIO
          };
        }
      }
    } catch (error) {
      logger.warn("No existe Local");
    }
    //

    if (updatedate) {
      logger.debug("HAY CAMBIO DE DATOS")
      return {
        ...state,
        step: STEPS.VALIDATE,
        tipo_error: TIPO_ERROR.EXTRACTOR_CAMBIO,
        laststep: STEPS.ORQUESTADOR_CAMBIO
      };
    }
    /*if (result.isCancelar) {
      return {
        ...state,
        tipo_error: '',
        laststep: '',
        step: STEPS.VALIDATE
      };
    }*/

    const template_ = Handlebars.compile(PROMPT_TEMPLATES.messagesSincambio.user);
    const USER_MS = template_({ input });
    const responsems = await invokeClaude(USER_MS, PROMPT_TEMPLATES.messagesSincambio.system);
    return {
      ...state,
      step: END,
      tipo_error: TIPO_ERROR.SIN_CAMBIO,
      response: responsems//"Al parecer no ingreso ningun dato correcto ya que no entiendo el cambio que desea realizar"
    };
  } catch (error) {
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}