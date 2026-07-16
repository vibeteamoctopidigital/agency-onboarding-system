import { Router } from "express";
import { socialController } from "./social.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { uploadAttachments } from "../../middlewares/upload";
import { validateRequest } from "../../utils/httpHandlers";
import {
  assignOrderSchema,
  createOrderSchema,
  listOrdersSchema,
  optionalNoteSchema,
  orderNoteSchema,
  orderStatusSchema,
  respondProposalSchema,
  updateOrderSchema,
} from "./social.schema";

const router = Router();

router.use(authenticate);

// Role-scoped list: owner sees all, team members their assignments, clients their own.
router.get("/orders", validateRequest(listOrdersSchema), socialController.list);
// Clients submit orders; owners create PROPOSED orders on a client's behalf.
router.post("/orders", authorize("AGENCY_OWNER", "SUB_ACCOUNT"), validateRequest(createOrderSchema), socialController.create);
router.get("/orders/:id", socialController.getById);
router.patch("/orders/:id", authorize("AGENCY_OWNER", "TEAM_MEMBER"), validateRequest(updateOrderSchema), socialController.updateOrder);

router.post("/orders/:id/accept", authorize("AGENCY_OWNER"), validateRequest(optionalNoteSchema), socialController.accept);
router.post("/orders/:id/respond", authorize("SUB_ACCOUNT"), validateRequest(respondProposalSchema), socialController.respondToProposal);
router.patch("/orders/:id/assign", authorize("AGENCY_OWNER"), validateRequest(assignOrderSchema), socialController.assign);
router.patch("/orders/:id/status", authorize("AGENCY_OWNER", "TEAM_MEMBER"), validateRequest(orderStatusSchema), socialController.setStatus);
router.post("/orders/:id/progress", validateRequest(orderNoteSchema), socialController.addProgressNote);
router.post("/orders/:id/confirm", authorize("SUB_ACCOUNT"), validateRequest(optionalNoteSchema), socialController.confirm);
router.post("/orders/:id/request-changes", authorize("SUB_ACCOUNT"), validateRequest(orderNoteSchema), socialController.requestChanges);
router.post("/orders/:id/cancel", authorize("AGENCY_OWNER"), validateRequest(optionalNoteSchema), socialController.cancel);
// Per-order media folder (multipart/form-data, field "files").
router.post("/orders/:id/files", uploadAttachments, socialController.addFiles);

// Owner's in-depth client profile (tickets + orders + activity).
router.get("/sub-accounts/:id/profile", authorize("AGENCY_OWNER"), socialController.subAccountProfile);

export { router as socialRouter };
