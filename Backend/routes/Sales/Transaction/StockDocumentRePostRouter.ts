// routes/Sales/Transaction/StockDocumentRePostRouter.ts
// Mounted as /StockDocumentRePost in routes/index.ts. Every route is behind the session check: the company and the
// user come from WHO is logged in.
import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import { rePost, getRange, getProgress } from "../../../controller/Sales/Transaction/StockDocumentRePostController.js";

const router = express.Router();

router.get("/getRange", authenticate, getRange); // page load: first / last posting no. and the posted count
router.get("/getProgress", authenticate, getProgress); // while posting: the document being posted now
router.post("/repost", authenticate, rePost); // the Post button

export default router;
