import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getItemList,
  getItemStock,
  getNextDocNo,
  getStockAdjustment,
  getFindList,
  saveStockAdjustment,
  deleteStockAdjustment,
  postStockAdjustment,
  printStockAdjustment,
} from "../../../controller/Sales/Transaction/StockAdjustmentController.js";

const router = express.Router();

// behind the session check: the branches shown depend on WHO is logged in
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getItemList", authenticate, getItemList);
router.get("/getItemStock", authenticate, getItemStock);
router.get("/getNextDocNo", authenticate, getNextDocNo);
router.get("/getStockAdjustment", authenticate, getStockAdjustment);
router.get("/getFindList", authenticate, getFindList);
// a POST: the lines travel in the body
router.post("/saveStockAdjustment", authenticate, saveStockAdjustment);
router.delete("/deleteStockAdjustment", authenticate, deleteStockAdjustment);
router.post("/postStockAdjustment", authenticate, postStockAdjustment);
// a POST: the print page asks for the data itself
router.post("/printStockAdjustment", authenticate, printStockAdjustment);

export default router;
