import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getToBranchList,
  getItemList,
  getItemStock,
  getNextDocNo,
  getStockTransfer,
  saveStockTransfer,
  deleteStockTransfer,
  postStockTransfer,
  printStockTransfer,
} from "../../../controller/Sales/Transaction/StockTransferController.js";

const router = express.Router();

// behind the session check: the From branches shown depend on WHO is logged in
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getToBranchList", authenticate, getToBranchList);
router.get("/getItemList", authenticate, getItemList);
router.get("/getItemStock", authenticate, getItemStock);
router.get("/getNextDocNo", authenticate, getNextDocNo);
router.get("/getStockTransfer", authenticate, getStockTransfer);
// a POST: the lines travel in the body
router.post("/saveStockTransfer", authenticate, saveStockTransfer);
router.delete("/deleteStockTransfer", authenticate, deleteStockTransfer);
router.post("/postStockTransfer", authenticate, postStockTransfer);
// a POST: the print page asks for the data itself
router.post("/printStockTransfer", authenticate, printStockTransfer);

export default router;
