
import logger from '../utils/logger.js';
import { FracttalService } from '../services/apirest.js';
import { END } from '@langchain/langgraph';
import { createTicketDb } from '../services/database.service.js';
import { CONSTANTES } from '../utils/constantes.js';
import { getClasificacion } from '../services/save.ticket.service.js'
import dotenv from 'dotenv';
import Handlebars from 'handlebars';
dotenv.config();
/**
 * Nodo de inicio - Saluda al usuario y solicita email
 */
export async function saveticketNode(state) {
  try {

    logger.warn("=====NODO saveticketNode=====")
    //const { conversationHistory, ...newState } = state;
    //logger.warn(JSON.stringify(newState, null, 2));
    let types_description = '';
    let types_1_description = '';
    let types_2_description = '';
    let clasificacion = null;
    let numero = 0;
    if (state.typeclass==='reclamos'||state.typeclass==='servicios_internos'||state.typeclass==='informacion') {
      state.clasificacion = 'SERVICIO';
    } else {
      clasificacion = await getClasificacion(state);
      types_description = clasificacion.nombre_nivel_3;
      types_1_description = clasificacion.nombre_nivel_1;
      types_2_description = clasificacion.nombre_nivel_2;
      state.clasificacion = types_description;
    }

    const oneMinuteAgoUTC = () => new Date(Date.now() - 60000).toISOString();
    const payload = {
      code: state.fractal_code,
      description: state.incidencia,
      requested_by: state.userName,
      email_requested_by: state.userEmail,
      types_description: types_description,
      types_1_description: types_1_description,
      types_2_description: types_2_description,
      identifier: state.localId,
      date_incident: oneMinuteAgoUTC(),
      user_code: process.env.FRACTTAL_USER_CODE,
      is_urgent: state.isUrgente === 'Urgente' ? true : false,
      user_type: 'HUMAN_RESOURCES',
    };

    if (state.typeclass==='reclamos'||state.typeclass==='servicios_internos'||state.typeclass==='informacion') {
      logger.debug("=====SAVE ZENDESK=====");
      numero = -2;
      await createTicketDb(state, numero, 'Abierto');
    } else {
      logger.debug("=====SAVE Fracttal=====");
      const fracttalService = new FracttalService(
        process.env.FRACTTAL_KEY,
        process.env.FRACTTAL_SECRET
      );
      const saveApi = await fracttalService.createWorkRequest(payload);
      const infodatos = saveApi["success"];
      if (infodatos) {
        numero = saveApi.data[0].id;
        await createTicketDb(state, numero, 'Abierto');
      }
    }

    const template = Handlebars.compile(CONSTANTES.messages.final);
    const USER = template({ numero });
    return {
      ...state,
      step: END,
      lastResponse: USER
    };
  } catch (error) {
    logger.error('Error en nodo inicio:', error);
    return {
      ...state,
      lastResponse: 'Lo siento, hubo un error al iniciar. Por favor, intenta de nuevo.'
    };
  }
}