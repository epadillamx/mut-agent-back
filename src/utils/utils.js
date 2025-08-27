
/**
 * Prepara el estado para ser guardado en la base de datos
 * Convierte Sets y otros objetos no serializables
 * @param {Object} state - Estado del workflow
 * @returns {Object} - Estado preparado para DB
 */
export function prepareStateForDB(state) {
    return {
        ...state,
        stepprevious: state.stepprevious ? Array.from(state.stepprevious) : []
    };
}

/**
 * Restaura el estado desde la base de datos
 * Reconstruye Sets y otros objetos
 * @param {Object} dbState - Estado desde la base de datos
 * @returns {Object} - Estado restaurado
 */
export function restoreStateFromDB(dbState) {
    return {
        ...dbState,
        stepprevious: new Set(dbState.stepprevious || [])
    };
}


export function extraerEmail(texto) {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = texto.match(regex);
  return match ? match[0] : '';
}