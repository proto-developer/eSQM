import { auditStateMachine } from "./audit.js";
import { auditFindingsStateMachine } from "./auditFinding.js";

const BOARD_NAME_TO_STATEMACHINE = {
  Audit: auditStateMachine,
  "Audit Findings": auditFindingsStateMachine,
};

const getWorkflowByName = (boardName) => {
  if (!BOARD_NAME_TO_STATEMACHINE.hasOwnProperty(boardName)) {
    throw new Error(`Unknown boardName: ${boardName}`);
  }
  return BOARD_NAME_TO_STATEMACHINE[boardName];
};

export {
  getWorkflowByName,
};
