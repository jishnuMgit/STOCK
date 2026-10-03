import { Router } from "express";
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
router.put("/:lkpUserID", saveUserPermissionCoBranch);
router.delete("/:lkpUserID", deleteUserPermissionCoBranch);

export default router;
