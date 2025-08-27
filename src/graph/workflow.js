import { StateGraph, END, START } from '@langchain/langgraph';
import { stateChannels, STEPS } from './state.js';
import { extractorNode } from '../nodes/extractor.node.js';
import { orquestadorcambioNode } from '../nodes/orquestadorcambio.node.js';
import { orquestadorNonde } from '../nodes/orquestador.node.js';

import { faltanteNode } from '../nodes/faltante.node.js';
import { validateNode } from '../nodes/validate.node.js';
import { confirmationNode } from '../nodes/confirmation.node.js';
import { saveticketNode } from '../nodes/save.ticket.node.js';


/**
 * Crea el grafo del flujo de conversación
 */
export function createTicketGraph() {

  const workflow = new StateGraph({
    channels: stateChannels
  });


  workflow.addNode(STEPS.ORQUESTADOR, orquestadorNonde);
  workflow.addNode(STEPS.ORQUESTADOR_CAMBIO, orquestadorcambioNode);
  workflow.addNode(STEPS.EXTRACTOR, extractorNode);
  workflow.addNode(STEPS.FALTANTE, faltanteNode);
  workflow.addNode(STEPS.VALIDATE, validateNode);
  workflow.addNode(STEPS.CONFIRMATION, confirmationNode);
  workflow.addNode(STEPS.SAVETICKET, saveticketNode);


  // Definir el flujo con edges
  workflow.addEdge(START, STEPS.ORQUESTADOR);

  workflow.addConditionalEdges(
    STEPS.ORQUESTADOR,
    (state) => {
      switch (state.step) {
        case STEPS.EXTRACTOR:
          return STEPS.EXTRACTOR;
        case STEPS.ORQUESTADOR_CAMBIO:
          return STEPS.ORQUESTADOR_CAMBIO;
        case STEPS.SAVETICKET:
          return STEPS.SAVETICKET;
        case STEPS.VALIDATE:
          return STEPS.VALIDATE;
        case STEPS.CONFIRMATION:
          return STEPS.CONFIRMATION;
        default:
          return END;
      }
    });

  workflow.addConditionalEdges(
    STEPS.ORQUESTADOR_CAMBIO,
    (state) => {
      switch (state.step) {
        case STEPS.VALIDATE:
          return STEPS.VALIDATE;
        default:
          return END;
      }
    });

  workflow.addEdge(STEPS.EXTRACTOR, STEPS.VALIDATE);

  workflow.addConditionalEdges(
    STEPS.VALIDATE,
    (state) => {
      switch (state.step) {
        case STEPS.FALTANTE:
          return STEPS.FALTANTE;
        case STEPS.CONFIRMATION:
          return STEPS.CONFIRMATION;
        default:
          return END;
      }
    });

  workflow.addEdge(STEPS.FALTANTE, END);
  workflow.addEdge(STEPS.CONFIRMATION, END);
  workflow.addEdge(STEPS.SAVETICKET, END);

  const graph = workflow.compile();
  return graph;
}

