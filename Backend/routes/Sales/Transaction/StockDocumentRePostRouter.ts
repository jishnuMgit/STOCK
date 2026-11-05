// routes/Sales/Transaction/StockDocumentRePostRouter.ts
// Mounted as /StockDocumentRePost in routes/index.ts. Every route is behind the session check: the company and the
// user come from WHO is logged in.
import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import { rePost } from "../../../controller/Sales/Transaction/StockDocumentRePostController.js";

const router = express.Router();

router.post("/repost", authenticate, rePost); // the Post button

export default router;
