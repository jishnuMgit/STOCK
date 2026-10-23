import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getItemList,
  getBeginningStock,
  saveBeginningStock,
  deleteBeginningStock,
  deleteBeginningStockLine,
  postBeginningStock,
  printBeginningStock,
  downloadBeginningStockExcel,
} from "../../../controller/Purchase/Transaction/BeginningStockController.js";

const router = express.Router();

// behind the session check: the branches shown depend on WHO is logged in
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getItemList", authenticate, getItemList);
router.get("/getBeginningStock", authenticate, getBeginningStock);
// a POST: the lines travel in the body
router.post("/saveBeginningStock", authenticate, saveBeginningStock);
router.delete("/deleteBeginningStock", authenticate, deleteBeginningStock);
// one line of a saved Beginning Stock (the x of a row): gone from the database at once
router.delete("/deleteBeginningStockLine", authenticate, deleteBeginningStockLine);
router.post("/postBeginningStock", authenticate, postBeginningStock);
// a POST: the page asks for the data itself
router.post("/printBeginningStock", authenticate, printBeginningStock);
// the same body: the Excel file of the Print Preview
router.post("/downloadBeginningStockExcel", authenticate, downloadBeginningStockExcel);

export default router;
