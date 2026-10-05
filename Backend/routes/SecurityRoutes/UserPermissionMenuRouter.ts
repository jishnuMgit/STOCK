
import { Router } from "express";
import {
  getUserIdList,
  getUserPermissions,
  getMenuStructure,
  saveUserPermissions,
  deleteUserPermissions,
} from "../../controller/SecurityController/UserPermissionMenuController.js";

const router = Router();

// must come before /:lkpUserID so "users" isn't read as a lkpUserID
router.get("/users/list", getUserIdList);

// also before /:lkpUserID, for the same reason
router.get("/structure", getMenuStructure);

router.get("/:lkpUserID", getUserPermissions);
router.put("/:lkpUserID", saveUserPermissions);
router.delete("/:lkpUserID", deleteUserPermissions);

export default router;