import { Router, type RequestHandler } from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getCompanyBranchStructure,
  getUserPermissionCoBranch,
  saveUserPermissionCoBranch,
  deleteUserPermissionCoBranch,
} from "../../controller/SecurityController/UserPermissionBranchController.js";

const router = Router();

// must come before /:lkpUserID so "structure" isn't read as a lkpUserID
router.get("/structure", getCompanyBranchStructure);

router.get("/:lkpUserID", getUserPermissionCoBranch);
// (typed handlers, so cast for the chain) behind the session check: save / delete need to know WHO is acting (idle, rights)
router.put("/:lkpUserID", authenticate, saveUserPermissionCoBranch as unknown as RequestHandler);
router.delete("/:lkpUserID", authenticate, deleteUserPermissionCoBranch as unknown as RequestHandler);

export default router;
