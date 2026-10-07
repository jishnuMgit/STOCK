import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";

import {
  getUserTypeList,
  getUserStatusList,
  getUserLoginList,
  saveUserLoginList,
  deleteUserLoginRow,
} from "../../controller/SecurityController/UserLoginController.js";

const router = express.Router();

router.get("/getUserTypeList", getUserTypeList);
router.get("/getUserStatusList", getUserStatusList);
router.get("/getUserLoginList", getUserLoginList);
// behind the session check: save / delete need to know WHO is acting (idle, rights)
router.post("/saveUserLoginList", authenticate, saveUserLoginList);
router.delete("/deleteUserLoginRow", authenticate, deleteUserLoginRow);

export default router;
