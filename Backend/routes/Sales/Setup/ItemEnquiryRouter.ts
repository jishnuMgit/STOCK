import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getItemList,
  getItemEnquiry,
} from "../../../controller/Sales/Setup/ItemEnquiryController.js";

const router = express.Router();

// behind the session check
router.get("/getItemList", authenticate, getItemList);
router.get("/getItemEnquiry", authenticate, getItemEnquiry);

export default router;
