import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getItemGroupList,
  getSalesPriceList,
  modifySalesPriceList,
} from "../../../controller/Sales/Setup/SalesPriceListController.js";

const router = express.Router();

// behind the session check: the user (and so the branches and the rights) come
// from the session
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getItemGroupList", authenticate, getItemGroupList);
router.get("/getSalesPriceList", authenticate, getSalesPriceList);
router.post("/modifySalesPriceList", authenticate, modifySalesPriceList);

export default router;
