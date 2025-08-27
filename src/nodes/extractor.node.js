import { invokeClaude } from '../services/claude.service.js';
import { STEPS, TIPO_ERROR } from '../graph/state.js';
import logger from '../utils/logger.js';
import { extraerEmail } from '../utils/utils.js';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';
import Handlebars from 'handlebars';

/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function extractorNode(state) {
  try {
    logger.warn("=====NODO extractorNode=====")
    //const { conversationHistory, ...newState } = state;
    //logger.warn(JSON.stringify(newState, null, 2));
    let input = state.conversationHistory[state.conversationHistory.length - 1]?.user || '';
    let result = {
      userName: state.userName,
      userEmail: state.userEmail,
      incidencia: state.incidencia,
      isUrgente: state.isUrgente
    };

    if (state.userEmail?.length == 0 || 'no proporcionado' === state.userEmail) {
      const extracEmail = extraerEmail(input);
      state.userEmail = extracEmail;
      logger.debug("==1==");
    }

    if (state.tipo_error === TIPO_ERROR.NOMBRE_LOCAL_ERRONEO) {
      logger.debug("==2==");
      logger.debug("BUSCAR LOCAL CAMABIO")
      logger.debug("input", input);
      const template = Handlebars.compile(PROMPT_TEMPLATES.extractLocal.user);
      const USER = template({ input });

      const response = await invokeClaude(USER, PROMPT_TEMPLATES.extractLocal.system);
      try {
        const resultlocalerroneo = JSON.parse(response);
        logger.debug("extractLocal", JSON.stringify(result, null, 2));
        if (resultlocalerroneo.userLocal.length != 0) {
          result.userLocal = resultlocalerroneo.userLocal;
        }
      } catch (error) {
        logger.warn("No existe Nombre");
      }
      result.userName = state.userName;
      result.userEmail = state.userEmail;
      result.incidencia = state.incidencia;
      result.isUrgente = state.isUrgente;
      result.userLocal = state.userLocal;
    }


    if (state.tipo_error !== TIPO_ERROR.NOMBRE_LOCAL_ERRONEO) {


      //******* extraccion NOMBRE
      if (state.userName.length == 0) {
        logger.debug("==EXTRAC NOMBRE==");
        logger.debug("input", input);
        const templatename = Handlebars.compile(PROMPT_TEMPLATES.extractNombre.user);
        const USER_NAME = templatename({ input });
        const response_name = await invokeClaude(USER_NAME, PROMPT_TEMPLATES.extractNombre.system);
        try {
          const resultname = JSON.parse(response_name);
          if (resultname.userName.length != 0) {
            result.userName = resultname.userName;
          }
        } catch (error) {
          logger.warn("No existe Nombre");
        }
      }
      //******* extraccion INCIDENCIA


      if (state.incidencia.length == 0) {
        logger.debug("==EXTRAC INCIDENCIA==");
        logger.debug("input", input);
        const template = Handlebars.compile(PROMPT_TEMPLATES.extractInfo.user);
        const USER = template({ input });
        const response = await invokeClaude(USER, PROMPT_TEMPLATES.extractInfo.system);
        try {
          const result_incidencia = JSON.parse(response);
          logger.debug("extractInfo", JSON.stringify(result_incidencia, null, 2));
          if (result_incidencia.texto.length != 0) {
            result.incidencia = result_incidencia.texto;
            result.isUrgente = result_incidencia.isUrgente;
            state.typeclass = result_incidencia.categoria;
          }
        } catch (error) {
          logger.warn("No existe incidencia");
        }
      }

      //local
      if (state.userLocal.length == 0) {
        logger.debug("BUSCAR LOCAL")
        logger.debug("input", input)
        const template = Handlebars.compile(PROMPT_TEMPLATES.extractLocal.user);
        const input_mayus=input.toUpperCase();
        const USER = template({ input_mayus });
        const response = await invokeClaude(USER, PROMPT_TEMPLATES.extractLocal.system);
        try {
          const resultlocal = JSON.parse(response);
          logger.debug("extractLocal", JSON.stringify(resultlocal, null, 2));
          if (resultlocal.userLocal.length != 0) {
            result.userLocal = resultlocal.userLocal;
            state.tipo_error = TIPO_ERROR.VALIDAR_LOCAL;
          }
        } catch (error) {
          logger.warn("No existe Local");
        }
      } else {
        result.userLocal = state.userLocal;
      }
    }

    //PRIMERA CONVERSACION Y Usuario registradado solo enviar la incidencia 
    if (!state.userNew && state.conversationHistory.length == 1) {
      logger.debug("==4==");
      logger.debug("PRIMERA CONVERSACION Y Usuario registradado solo enviar la incidencia")
      result.userLocal = state.userLocal;
      result.userName = state.userName;
    }

    //
    const userNameresult = result.userName === 'no proporcionado' ? '' : result.userName ?? '';
    const userLocalresult = result.userLocal === 'no proporcionado' ? '' : result.userLocal ?? '';
    const incidenciaresult = result.incidencia === 'no proporcionado' ? '' : result.incidencia ?? '';
    const isUrgenteresult = result.isUrgente ?? '';

    logger.debug("***** RESPONSE ******");
    logger.debug("userNameresult", userNameresult);
    logger.debug("userLocalresult", userLocalresult);
    logger.debug("incidenciaresult", incidenciaresult);
    logger.debug("isUrgenteresult", isUrgenteresult);
    logger.debug("tipo_error", state.tipo_error);
    logger.debug("userEmail", state.userEmail);

    return {
      ...state,
      userName: userNameresult,
      userLocal: userLocalresult,
      incidencia: incidenciaresult,
      isUrgente: isUrgenteresult,
      laststep: STEPS.EXTRACTOR
    };

  } catch (error) {
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}
