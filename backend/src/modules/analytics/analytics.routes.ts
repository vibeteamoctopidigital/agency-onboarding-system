import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.use(authenticate);

router.get("/dashboard", authorize("AGENCY_OWNER"), analyticsController.getDashboard);

export { router as analyticsRouter };
