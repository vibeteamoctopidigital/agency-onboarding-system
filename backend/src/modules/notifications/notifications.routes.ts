import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", notificationsController.list);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/:id/read", notificationsController.markAsRead);
router.patch("/read-all", notificationsController.markAllAsRead);

export { router as notificationsRouter };
