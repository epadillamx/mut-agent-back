
import { STEPS, TIPO_ERROR } from '../graph/state.js';
import logger from '../utils/logger.js';
import { validateLocationDb } from '../services/database.service.js';
import { processLocationSelection } from '../services/validate.service.js';
import { END } from '@langchain/langgraph';


/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function validateNode(state) {
  try {
    logger.warn("=====NODO validateNode=====")
    //const { conversationHistory, ...newState } = state;
    //logger.debug(JSON.stringify(newState, null, 2));

    if (state.availableLocations && state.availableLocations.length > 1) {
      let messageUser = state.conversationHistory[state.conversationHistory.length - 1]?.user || '';
      const loc = await processLocationSelection(messageUser, state.availableLocations);
      if (loc) {
        logger.info('Usuario seleccionó:', loc.nombre_local);
        if (state.userName.length != 0 && state.userEmail.length != 0 && state.incidencia.length != 0) {
          return {
            ...state,
            step: STEPS.CONFIRMATION,
            availableLocations: null,
            lastResponse: null,
            tipo_error: null,
            userLocal: loc.userLocal + '-' + loc.tipo,
            localId: loc.localId,
            fractal_code: loc.fractal_code,
          };
        }
        return {
          ...state,
          step: STEPS.FALTANTE,
          availableLocations: null,
          lastResponse: null,
          userLocal: loc.userLocal + '-' + loc.tipo,
          localId: loc.localId,
          fractal_code: loc.fractal_code,
          tipo_error: TIPO_ERROR.FALTANTE
        };

      }
      return {
        ...state,
        step: STEPS.FALTANTE,
        tipo_error: TIPO_ERROR.DOBLE_FALLO,
        lastResponse: null,
      };
    }


    if ((state.laststep === STEPS.EXTRACTOR) || state.laststep === STEPS.ORQUESTADOR_CAMBIO) {
      logger.debug("=====01=====")
      if (state.userName.length != 0 && state.userEmail.length != 0 && state.userLocal.length != 0 && state.incidencia.length != 0) {
        if (!state.userNew && state.tipo_error !== TIPO_ERROR.NOMBRE_LOCAL_ERRONEO && state.tipo_error !== TIPO_ERROR.LOCAL_CAMBIO) {
          logger.debug("=====02=====")
          return {
            ...state,
            step: STEPS.CONFIRMATION,
            lastResponse: null
          };
        }
        logger.debug("=====03=====")
        if (state.localId.length != 0) {
          return {
            ...state,
            step: STEPS.CONFIRMATION,
            lastResponse: null
          };
        }


        //validar Local
        logger.debug("=====VALIDAR LOCAL DATOS COMPLETOS=====")
        const locationResult = await validateLocationDb(state.userLocal);
        if (locationResult.exact && locationResult.locations.length === 1) {
          logger.debug("=====04=====")
          const loc = locationResult.locations[0];
          return {
            ...state,
            step: STEPS.CONFIRMATION,
            userLocal: loc.nombre,
            localId: loc.locatarioid,
            fractal_code: loc.fractal_code,
            lastResponse: null,
            tipo_error :''
          };
        } else if (locationResult.locations.length > 1) {
          logger.debug("=====05=====")
          return {
            ...state,
            step: STEPS.FALTANTE,
            tipo_error: TIPO_ERROR.DOBLE,
            availableLocations: locationResult.locations
            
          };

        } else {
          logger.debug("=====06=====")
          return {
            ...state,
            step: STEPS.FALTANTE,
            tipo_error :'',
            tipo_error: TIPO_ERROR.NOMBRE_LOCAL_ERRONEO
          };

        }

      }
      if (state.tipo_error === TIPO_ERROR.VALIDAR_LOCAL && state.userLocal.length != 0) {
        logger.debug("=====VALIDAR LOCAL=====")
        const locationResult = await validateLocationDb(state.userLocal);
        if (locationResult.exact && locationResult.locations.length === 1) {
          logger.debug("=====V1=====")
          const loc = locationResult.locations[0];
          state.userLocal = loc.nombre;
          state.localId = loc.locatarioid;
          state.fractal_code = loc.fractal_code;
          state.tipo_error = ''

        } else if (locationResult.locations.length > 1) {
          logger.debug("=====V2=====")
          return {
            ...state,
            step: STEPS.FALTANTE,
            tipo_error: TIPO_ERROR.DOBLE,
            availableLocations: locationResult.locations
          };

        }
      }
      return {
        ...state,
        step: STEPS.FALTANTE,
        tipo_error: TIPO_ERROR.FALTANTE
      };
    }
    return {
      ...state,
      step: END
    };
  } catch (error) {
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}