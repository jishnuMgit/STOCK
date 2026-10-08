import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getStaffList,
  haveStaffTrans,
  saveStaff,
} from "../../../controller/Purchase/Setup/StaffPageController.js";

const router = express.Router();

router.get("/getStaffList", getStaffList);
router.get("/haveStaffTrans", haveStaffTrans);
// behind the session check: the save (new, changed AND removed staff) needs to
// know WHO is acting (idle, rights)
router.post("/saveStaff", authenticate, saveStaff);

export default router;
