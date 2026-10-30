// routes/Sales/Transaction/StockDocumentPostRouter.ts
// Mounted as /StockDocumentPost in routes/index.ts. Every route is behind the session check: the
// company, the user and the branches the user may use come from WHO is logged in.
import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getLookups,
  getList,
  postDocuments,
} from "../../../controller/Sales/Transaction/StockDocumentPostController.js";

const router = express.Router();

router.get("/lookups", authenticate, getLookups); // branches, default branch, documents, years
router.get("/list", authenticate, getList); // the documents that are not posted yet
router.post("/post", authenticate, postDocuments); // the Post button

export default router;
