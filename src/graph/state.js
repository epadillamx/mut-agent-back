/**
 * Estado inicial para cada sesión de chat
 */
export const createInitialState = () => ({
  step: 'inicio',
  userId: null,
  userName: '',
  userEmail: '',
  userPhone: '',
  userLocal: '',
  localId: '',
  fractal_code: '',
  tempLocation: null,
  availableLocations: null,
  conversationHistory: [],
  lastResponse: null,
  userNew: true,
  stepprevious: new Set(),
  incidencia: '',
  isUrgente: '',
  tipo_error: '',
  tipo_error_cambio: '',
  laststep: '',
  clasificacion: '',
  sessionId: '',
  isMessagewelcome: false,
  messageIdactual: '',
  messageIdlast: '',
  responseisPositive: true,
  typeclass: 'INCIDENCIA'
});

/**
 * Definición de canales para el StateGraph
 */
export const stateChannels = {
  step: null,
  userId: null,
  userName: null,
  userEmail: null,
  userPhone: null,
  userLocal: null,
  localId: null,
  fractal_code: null,
  tempLocation: null,
  availableLocations: null,
  conversationHistory: null,
  lastResponse: null,
  userNew: null,
  stepprevious: null,
  incidencia: null,
  isUrgente: null,
  tipo_error: null,
  tipo_error_cambio: null,
  laststep: null,
  clasificacion: null,
  sessionId: null,
  isMessagewelcome: null,
  messageIdactual: null,
  messageIdlast: null,
  responseisPositive: null,
  typeclass: null
};

/**
 * Pasos posibles en el flujo
 */

export const TIPO_ERROR = {
  CAMBIO: 'cambio',
  CAMBIO_EMAIL: 'cambio_email',
  FALTANTE: 'faltante',
  DOBLE: 'doble',
  DOBLE_FALLO: 'doble_fallo',
  //LOCAL: 'local',
  LOCAL_CAMBIO: 'local_cambio',
  EXTRACTOR_CAMBIO: 'extractor_cambio',
  SIN_CAMBIO: 'sin_cambio',
  NOMBRE_LOCAL_ERRONEO: 'ERRONEO_LOCAL',
  VALIDAR_LOCAL: 'VALIDAR_LOCAL'
}


export const STEPS = {
  ORQUESTADOR: 'orquestador',
  ORQUESTADOR_CAMBIO: 'orquestador_cambio',
  CAMBIO_LOCAL: 'cambio_local',
  CAMBIO_EXTRACTOR: 'cambio_extractor',
  CAMBIO_SIN: 'cambio_sin',
  EXTRACTOR: 'extractor',
  DOBLE_LOCAL: 'doble_local',
  FALTANTE: 'faltante',
  VALIDATE: 'validate',
  CONFIRMATION: 'confirmation',
  SAVETICKET: 'saveticket'
}