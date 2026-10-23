import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getBranch,
  saveBranch,
} from "../../controller/Administration/BranchController.js";

const router = express.Router();

// behind the session check: the user (and so "is this the administrator?")
// comes from the session
router.get("/getBranch", authenticate, getBranch);
router.post("/saveBranch", authenticate, saveBranch);

export default router;
