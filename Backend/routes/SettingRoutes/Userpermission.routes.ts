
import { Router } from "express";
import {
  getUserIdList,
  getUserPermissions,
  saveUserPermissions,
  deleteUserPermissions,
} from "../../controller/SettingController/Userpermission.controller.js";

const router = Router();

// must come before /:lkpUserID so "users" isn't read as a lkpUserID
router.get("/users/list", getUserIdList);

router.get("/:lkpUserID", getUserPermissions);
router.put("/:lkpUserID", saveUserPermissions);
router.delete("/:lkpUserID", deleteUserPermissions);

export default router;