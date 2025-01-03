import { qualityEventStateMachine } from "./qualityEvent.js";
import { supplierStateMachine } from "./supplier.js";
import { effectivenessCheckStateMachine } from "./effectiveness-check.js";
import { capaStateMachine } from "./capa.js";

const BOARD_NAME_TO_STATEMACHINE = {
  Supplier: supplierStateMachine,
  "Quality Event": qualityEventStateMachine,
  "Effectiveness Checks": effectivenessCheckStateMachine,
  CAPA: capaStateMachine,
};

const getWorkflowByName = (boardName) => {
  if (!BOARD_NAME_TO_STATEMACHINE.hasOwnProperty(boardName)) {
    throw new Error(`Unknown boardName: ${boardName}`);
  }
  return BOARD_NAME_TO_STATEMACHINE[boardName];
};

export { getWorkflowByName };
