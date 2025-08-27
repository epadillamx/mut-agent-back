import { STEPS, TIPO_ERROR } from '../graph/state.js';
import logger from '../utils/logger.js';
import { END } from '@langchain/langgraph';
import { PROMPT_TEMPLATES } from '../plantillas/prompts.js';
import { invokeClaude } from '../services/claude.service.js';
import { extraerEmail } from '../utils/utils.js';
import Handlebars from 'handlebars';
import { createTicketDb } from '../services/database.service.js';
/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function orquestadorNonde(state) {

  try {
    logger.warn("=====NODO orquestadorNonde=====")
    //const { conversationHistory, ...newState } = state;
    // logger.warn(JSON.stringify(newState, null, 2));
    if (state.messageIdactual === state.messageIdlast) {
      logger.debug("===========EXISTE DUPLICACION}========")
      return {
        ...state,
        step: END,
        lastResponse: '#REPLICA#'
      };
    }
    state.messageIdlast = state.messageIdactual;
    state.messageIdactual = '';

    let mensaje = state.conversationHistory[state.conversationHistory.length - 1]?.user || '';
    let result = null;
    if (state.tipo_error === TIPO_ERROR.SIN_CAMBIO) {
      return {
        ...state,
        tipo_error: TIPO_ERROR.CAMBIO,
        step: STEPS.ORQUESTADOR_CAMBIO,
      };
    }

    const userNameChanged = state.userName.length != 0;
    const userEmailChanged = state.userEmail.length != 0;
    const incidenciaChanged = state.incidencia.length != 0;
    const localChanged = state.userLocal.length != 0;

    if (userNameChanged && userEmailChanged && incidenciaChanged && localChanged && TIPO_ERROR.DOBLE !== state.tipo_error && state.conversationHistory.length > 1) {

      /*let valoreActuala = '';
      if (state.userName.length != 0) {
        valoreActuala += '- Nombre: ' + state.userName + '\n';
      }
      if (state.incidencia.length != 0) {
        valoreActuala += '- Incidencia: ' + state.incidencia + '\n';
      }
      if (state.userLocal.length != 0) {
        valoreActuala += '- Local: ' + state.userLocal + '\n';
      }*/

      //**** valodar si hay cambio de email
      /*const extracEmail = extraerEmail(mensaje);
      if (extracEmail.length != 0) {
        if (extracEmail !== state.userEmail) {
          return {
            ...state,
            userEmail: extracEmail,
            tipo_error: TIPO_ERROR.CAMBIO_EMAIL,
            step: STEPS.ORQUESTADOR_CAMBIO

          }
        }
      }*/
      //*** 

      // Validar confirmacion
      const template = Handlebars.compile(PROMPT_TEMPLATES.validateconfirmation.user);
      const USER = template({ mensaje });
      const response = await invokeClaude(USER, PROMPT_TEMPLATES.validateconfirmation.system);
      result = JSON.parse(response);


      if (STEPS.CONFIRMATION === state.laststep && result && !result.isCambio) {
        if (result.isPositive && result.isPositive !== null) {
          return {
            ...state,
            responseisPositive: result.isPositive,
            step: STEPS.SAVETICKET,
          };
        }
        if (!result.isPositive && result.isPositive !== null) {
          const template = Handlebars.compile(PROMPT_TEMPLATES.cancelacion.user);
          const USER = template({ mensaje });
          const response = await invokeClaude(USER, PROMPT_TEMPLATES.cancelacion.system);
          logger.debug("Cancelar ticket");
          await createTicketDb(state, -99, 'Cancelado');
          return {
            ...state,
            step: END,
            responseisPositive: result.isPositive,
            lastResponse: response
          };
        }
      }
      //================ Validar CAMBIOS =====


      const templatechange = Handlebars.compile(PROMPT_TEMPLATES.orquestadordecambio.user);
      const USER_CHANGE = templatechange({ mensaje });
      const responsechange = await invokeClaude(USER_CHANGE, PROMPT_TEMPLATES.orquestadordecambio.system);
      try {
        const resultchange = JSON.parse(responsechange);
        logger.debug("resultchange", resultchange);
        if (resultchange.isChangeRequest) {
          logger.debug("Sin cambios por datos");
          return {
            ...state,
            tipo_error: TIPO_ERROR.CAMBIO,
            step: STEPS.ORQUESTADOR_CAMBIO,
          };
        }
      } catch (error) {
        logger.warn("Sin cambios");
      }



      //=================
      //
      /*logger.warn("=====VALICAR CAMBIO ORQUESTADO=====")
      const hasName = 'no proporcionado';
      const hasIncidencia = 'no proporcionado';
      const hasLocal = 'no proporcionado';
      const template = Handlebars.compile(PROMPT_TEMPLATES.extractInfo.user);
      const input = mensaje;
      const USER = template({ input, hasName, hasIncidencia, hasLocal });
      const response = await invokeClaude(USER, PROMPT_TEMPLATES.extractInfo.system);
      const resultextrac = JSON.parse(response);
      if (resultextrac.userName) {
        if (resultextrac.userName !== state.userName) {
          result.isCambio = true;
        }
      } else if (resultextrac.userLocal) {
        if (resultextrac.userLocal !== state.userLocal) {
          result.isCambio = true;
        }
      } else if (resultextrac.incidencia) {
        if (resultextrac.incidencia !== state.incidencia) {
          result.isCambio = true;
        }
      }
      if (result.isCambio) {
        state.tipo_error = TIPO_ERROR.CAMBIO;
        result.isPositive = true;
        result.isNeutral = false;
      }*/

      /*if (result.isCambio && result.isPositive !== null) {
        state.tipo_error = TIPO_ERROR.CAMBIO;
        result.isPositive = true;
        result.isNeutral = false;
      }*/
      //
    }


    if (TIPO_ERROR.DOBLE_FALLO === state.tipo_error) {
      return {
        ...state,
        tipo_error: TIPO_ERROR.DOBLE,
        step: STEPS.VALIDATE
      };

    }
    if (TIPO_ERROR.DOBLE === state.tipo_error) {
      return {
        ...state,
        step: STEPS.VALIDATE
      };

    }
    /*if (TIPO_ERROR.CAMBIO === state.tipo_error && state.laststep !== STEPS.ORQUESTADOR_CAMBIO) {
      return {
        ...state,
        step: STEPS.ORQUESTADOR_CAMBIO,
      };

    }*/


    /*const template = Handlebars.compile(PROMPT_TEMPLATES.validateGreetings.user);
    const USER_SALUDO = template({ mensaje });
    const response_saludo = await invokeClaude(USER_SALUDO, PROMPT_TEMPLATES.validateGreetings.system);
    const result_saludo = JSON.parse(response_saludo);
    state.isMessagewelcome = result_saludo.isGreeting;*/




    return {
      ...state,
      step: STEPS.EXTRACTOR,
    };
  } catch (error) {
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      step: END,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}