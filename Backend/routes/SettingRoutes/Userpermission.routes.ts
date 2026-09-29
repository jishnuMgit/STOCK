
import { Router } from "express";
import {
  getUserPermissions,
  saveUserPermissions,
  deleteUserPermissions,
} from "../../controller/SettingController/Userpermission.controller.js";

const router = Router();

router.get("/:userId", getUserPermissions);
router.put("/:userId", saveUserPermissions);
router.delete("/:userId", deleteUserPermissions);

export default router;