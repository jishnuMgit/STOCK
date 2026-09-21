import express from "express";

import {
  getReceipt,
  getReceiptType,
  getDocNo,
  getDivID,
  saveReceipt,
  modifyReceipt,
  testget,
  DeleteReceipt,
  GetDatas,
  getReceiptPrint
} from "../controller/ReceiptController.js";

const router = express.Router();

router.get("/getReceipt", getReceipt);

router.post("/getReceiptType", getReceiptType);

router.post("/getDocNo", getDocNo);

router.post("/getDivID", getDivID);

router.post("/saveReceipt", saveReceipt);

router.post("/modifyReceipt", modifyReceipt);

// router.get("/saveReceipt", testget);

router.post("/get/data", GetDatas);

router.get("/get/data", GetDatas);
router.delete('/delete',DeleteReceipt)

router.get("/print", getReceiptPrint);

export default router;