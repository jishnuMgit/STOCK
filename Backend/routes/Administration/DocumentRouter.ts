import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getDocument,
  saveDocument,
} from "../../controller/Administration/DocumentController.js";

const router = express.Router();

// behind the session check: the user (and so "is this the administrator?")
// comes from the session
router.get("/getDocument", authenticate, getDocument);
router.post("/saveDocument", authenticate, saveDocument);

export default router;
