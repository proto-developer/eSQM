import express from "express";
import { authenticationMiddleware } from "../middlewares/authentication.js";
import { subscriptionMiddleware } from "../middlewares/subscription.js";
import { mondayClientMiddleware } from "../middlewares/monday-client.js";
import { sentryContextMiddleware } from "../middlewares/sentry-context.js";
import { assignAutoNumber } from "../controllers/auto-number-controller.js";

const router = express.Router();

router.post(
  "/monday/auto_number/execute",
  authenticationMiddleware,
  mondayClientMiddleware,
  sentryContextMiddleware,
  subscriptionMiddleware,
  assignAutoNumber
);

export default router;
