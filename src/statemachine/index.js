import { auditStateMachine } from "./audit.js";
import { auditFindingsStateMachine } from "./auditFinding.js";
import { qualityEventStateMachine } from "./qualityEvent.js";
import { supplierStateMachine } from "./supplier.js";

const BOARD_NAME_TO_STATEMACHINE = {
  Supplier: supplierStateMachine,
  "Quality Event": qualityEventStateMachine,
};

const getWorkflowByName = (boardName) => {
  if (!BOARD_NAME_TO_STATEMACHINE.hasOwnProperty(boardName)) {
    throw new Error(`Unknown boardName: ${boardName}`);
  }
  return BOARD_NAME_TO_STATEMACHINE[boardName];
};

export { getWorkflowByName };
