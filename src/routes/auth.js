import { Router } from "express";
import * as authController from "../controllers/auth-controller.js";

const router = Router();

router.get("/auth/monday/callback", authController.mondayViewCallback);

export default router;
