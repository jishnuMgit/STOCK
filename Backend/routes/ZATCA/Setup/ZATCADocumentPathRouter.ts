import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  browseFolders,
  getZATCAFilePath,
  saveZATCAFilePath,
} from "../../../controller/ZATCA/Setup/ZATCADocumentPathController.js";

const router = express.Router();


router.get("/getZATCAFilePath", authenticate, getZATCAFilePath);
router.get("/browseFolders", authenticate, browseFolders);
router.post("/saveZATCAFilePath", authenticate, saveZATCAFilePath);

export default router;


