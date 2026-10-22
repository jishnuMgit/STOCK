import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getYear,
  saveYear,
  deleteYear,
} from "../../controller/Administration/YearController.js";

const router = express.Router();

// behind the session check: the user (and so "is this the administrator?")
// comes from the session
router.get("/getYear", authenticate, getYear);
router.post("/saveYear", authenticate, saveYear);
router.post("/deleteYear", authenticate, deleteYear);

export default router;
