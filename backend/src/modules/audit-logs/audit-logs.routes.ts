import { Router } from "express";
import { auditLogsController } from "./audit-logs.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

router.use(authenticate);

router.get("/", authorize("AGENCY_OWNER"), auditLogsController.list);

export { router as auditLogsRouter };
