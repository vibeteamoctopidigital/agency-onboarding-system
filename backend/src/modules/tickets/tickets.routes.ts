import { Router } from "express";
import { ticketsController } from "./tickets.controller";
import { validateRequest } from "../../utils/httpHandlers";
import {
  createTicketSchema,
  moveStageSchema,
  assignSchema,
  commentSchema,
  reviewSchema,
  listTicketsSchema,
} from "./tickets.schema";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { uploadAttachments } from "../../middlewares/upload";

const router = Router();

router.use(authenticate);

router.get("/", authorize("AGENCY_OWNER"), validateRequest(listTicketsSchema), ticketsController.list);
router.get("/mine", authorize("TEAM_MEMBER"), ticketsController.listMine);
router.get("/my", authorize("SUB_ACCOUNT"), ticketsController.listMyTickets);
router.get("/unassigned", authorize("AGENCY_OWNER"), ticketsController.getUnassigned);
router.get("/review", authorize("AGENCY_OWNER"), ticketsController.getReviewQueue);
// Tickets are filed by clients (for themselves) or the owner (on a client's
// behalf) - team members work tickets, they don't create them.
router.post("/", authorize("AGENCY_OWNER", "SUB_ACCOUNT"), validateRequest(createTicketSchema), ticketsController.create);
router.get("/:id", ticketsController.getById);
router.patch("/:id/stage", authorize("AGENCY_OWNER", "TEAM_MEMBER"), validateRequest(moveStageSchema), ticketsController.moveStage);
router.patch("/:id/assign", authorize("AGENCY_OWNER"), validateRequest(assignSchema), ticketsController.assign);
router.post("/:id/comment", validateRequest(commentSchema), ticketsController.addComment);
// Attachments: any role with access to the ticket may upload (clients included).
// multipart/form-data - parsed by multer, not the JSON body parser.
router.post("/:id/attachments", uploadAttachments, ticketsController.addAttachments);
router.get("/:id/history", ticketsController.getHistory);
router.post("/:id/approve", authorize("AGENCY_OWNER"), validateRequest(reviewSchema), ticketsController.approve);
router.post("/:id/reject", authorize("AGENCY_OWNER"), validateRequest(reviewSchema), ticketsController.reject);

export { router as ticketsRouter };
