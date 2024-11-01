import { Router } from "express";
import { getAuditTrail } from "../controllers/audit-trail-controller.js";
import { clientSecretAuthenticationMiddleware } from "../middlewares/authentication.js";
import { mondayConnectionCheckMiddleware } from "../middlewares/monday-connection-check.js";
import { mondayClientMiddleware } from "../middlewares/monday-client.js";

const router = Router();

router.use(clientSecretAuthenticationMiddleware);
router.use(mondayConnectionCheckMiddleware);
router.use(mondayClientMiddleware);

router.get("/trail", getAuditTrail);

export default router;
