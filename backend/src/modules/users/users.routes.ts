import { Router } from "express";
import { usersController } from "./users.controller";
import { validateRequest } from "../../utils/httpHandlers";
import { createTeamMemberSchema, updateUserSchema, urlParamsSchema, createSubAccountSchema } from "./users.schema";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();


router.use(authenticate);

router.get("/team", authorize("AGENCY_OWNER"), usersController.listTeamMembers);
router.post("/team", authorize("AGENCY_OWNER"), validateRequest(createTeamMemberSchema), usersController.createTeamMember);
// Pull all users from the GHL agency (PIT, users.readonly) and create missing team members.
router.post("/team/sync-ghl", authorize("AGENCY_OWNER"), usersController.syncTeamFromGhl);
router.put("/team/:id", authorize("AGENCY_OWNER"), validateRequest(updateUserSchema), usersController.updateTeamMember);
router.delete("/team/:id", authorize("AGENCY_OWNER"), usersController.deleteTeamMember);

router.patch("/availability", authorize("TEAM_MEMBER"), usersController.toggleAvailability);

router.get("/stats/me", usersController.getMyStats);
router.get("/stats/all", authorize("AGENCY_OWNER"), usersController.listAllTeamStats);

router.get("/sub-accounts", authorize("AGENCY_OWNER"), usersController.listSubAccounts);
router.post("/sub-accounts", authorize("AGENCY_OWNER"), validateRequest(createSubAccountSchema), usersController.createSubAccount);

export { router as usersRouter };
