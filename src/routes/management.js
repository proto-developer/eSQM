import { Router } from "express";
import { secretKeyAuthMiddleware } from "../middlewares/secret-key-auth.js";
import {
  deleteAccountAuth,
  setAccountFeatureFlag,
} from "../controllers/management-controller.js";

const router = Router();
router.use(secretKeyAuthMiddleware);

router.post("/auth/delete", deleteAccountAuth);
router.post("/flag/set", setAccountFeatureFlag);

export default router;
