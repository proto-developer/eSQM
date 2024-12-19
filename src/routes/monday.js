import express from "express";
import { authenticationMiddleware } from "../middlewares/authentication.js";
import { subscriptionMiddleware } from "../middlewares/subscription.js";
import { mondayClientMiddleware } from "../middlewares/monday-client.js";
import { sentryContextMiddleware } from "../middlewares/sentry-context.js";
import { assignAutoNumber } from "../controllers/auto-number-controller.js";
import { changeStatusAutomation } from "../controllers/status-automation.js";
import { calculateNextAuditDate } from "../controllers/next-audit-date-controller.js";

const router = express.Router();

router.post(
  "/monday/auto_number/execute",
  authenticationMiddleware,
  mondayClientMiddleware,
  sentryContextMiddleware,
  subscriptionMiddleware,
  assignAutoNumber
);

router.post(
  "/monday/nextAuditDate_calculation/execute",
  authenticationMiddleware,
  mondayClientMiddleware,
  subscriptionMiddleware,
  calculateNextAuditDate
);

router.post(
  "/monday/status_automation/execute",
  authenticationMiddleware,
  mondayClientMiddleware,
  subscriptionMiddleware,
  changeStatusAutomation
);

export default router;
