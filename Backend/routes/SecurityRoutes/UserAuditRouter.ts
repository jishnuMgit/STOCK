import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getUserList,
  getActionList,
  getUserAuditList,
} from "../../controller/SecurityController/UserAuditController.js";

const router = express.Router();

// every route is behind the session check: what a user sees depends on WHO is
// logged in (an Admin User sees every user's audit, anyone else only their own)
router.get("/getUserList", authenticate, getUserList);
router.get("/getActionList", authenticate, getActionList);
// a POST: what was picked travels in the body, not in the address
router.post("/getUserAuditList", authenticate, getUserAuditList);

export default router;
