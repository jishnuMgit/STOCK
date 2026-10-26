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
  deleteStockAdjustmentLine,
  postStockAdjustment,
  printStockAdjustment,
  downloadStockAdjustmentExcel,
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
// one line of a saved adjustment (the x of a row): gone from the database at once
router.delete("/deleteStockAdjustmentLine", authenticate, deleteStockAdjustmentLine);
router.post("/postStockAdjustment", authenticate, postStockAdjustment);
// a POST: the page asks for the data itself
router.post("/printStockAdjustment", authenticate, printStockAdjustment);
// the same body: the Excel file of the Print Preview
router.post("/downloadStockAdjustmentExcel", authenticate, downloadStockAdjustmentExcel);

export default router;
