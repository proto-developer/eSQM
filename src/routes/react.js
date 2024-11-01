import { Router } from "express";
import { staticOrProxyReactMiddleware } from "../middlewares/serve-react.js";

const router = Router();

// Workflow item view
const workflow_item_path = "/item_views/workflow";
const workflow_item_proxy_middleware = staticOrProxyReactMiddleware(
  `http://localhost:3000${workflow_item_path}`,
  "workflow_item_view/build/"
);

router.use(workflow_item_path, workflow_item_proxy_middleware);
router.use(`${workflow_item_path}/*`, workflow_item_proxy_middleware);

// Audi trail item view
const audittrail_item_path = "/item_views/audittrail";
const audittrail_item_proxy_middleware = staticOrProxyReactMiddleware(
  `http://localhost:3000${audittrail_item_path}`,
  "audittrail_item_view/build/"
);
router.use(audittrail_item_path, audittrail_item_proxy_middleware);
router.use(`${audittrail_item_path}/*`, audittrail_item_proxy_middleware);

export default router;
