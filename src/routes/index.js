import express from "express";
import authRoutes from "./auth.js";
import mondayRoutes from "./monday.js";
import reactRoutes from "./react.js";
import apiRoutes from "./api.js";
import managementRoutes from "./management.js";
import trailRouter from "./trail.js";

const router = express.Router();

router.use(authRoutes);
router.use(mondayRoutes);
router.use(reactRoutes);
router.use("/audit", trailRouter);
router.use("/api", apiRoutes);
router.use("/management", managementRoutes);

router.get("/", function (req, res) {
  res.json(getHealth());
});

router.get("/health", function (req, res) {
  res.json(getHealth());
  res.end();
});

function getHealth() {
  return {
    ok: true,
    message: "Healthy",
  };
}

export default router;
