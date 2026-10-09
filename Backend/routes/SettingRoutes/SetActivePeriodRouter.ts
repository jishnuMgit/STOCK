import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getActivePeriodList,
  saveActivePeriod,
} from "../../controller/SettingController/SetActivePeriodController.js";

const router = express.Router();

// behind the session check: what a user sees depends on WHO is logged in
// (only the branches that user has a right to)
router.get("/getActivePeriodList", authenticate, getActivePeriodList);
router.post("/saveActivePeriod", authenticate, saveActivePeriod);

export default router;
