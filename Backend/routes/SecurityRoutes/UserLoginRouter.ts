import express from "express";

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
router.post("/saveUserLoginList", saveUserLoginList);
router.delete("/deleteUserLoginRow", deleteUserLoginRow);

export default router;
