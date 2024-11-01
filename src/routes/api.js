import { Router } from "express";
import { clientSecretAuthenticationMiddleware } from "../middlewares/authentication.js";
import { mondayConnectionCheckMiddleware } from "../middlewares/monday-connection-check.js";
import { mondayClientMiddleware } from "../middlewares/monday-client.js";
import { featureFlagsMiddleware } from "../middlewares/flags.js";
import {
  getItemWorkflowState,
  performWorkflowAction,
} from "../controllers/qms-workflow-controller.js";
import { getESignPin, validatePin } from "../controllers/esign-controller.js";

const router = Router();

router.use(clientSecretAuthenticationMiddleware);
router.use(mondayConnectionCheckMiddleware);
router.use(mondayClientMiddleware);
router.use(featureFlagsMiddleware);

router.post("/workflow/get_item_workflow_state", getItemWorkflowState);
router.post("/workflow/perform_action", performWorkflowAction);
router.get("/esign/pin", getESignPin);
router.post("/esign/validate_pin", validatePin);

export default router;
