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
  getReceiptPrint,
  getReceiptExcel,
  applyReceiptPost,
  getAttachments,
  getAttachmentFile,
  saveAttachments,
} from "../controller/ReceiptController.js";

import { requireReceiptContext } from "../middleware/receiptContext.js";

const router = express.Router();

router.use(requireReceiptContext);
router.get("/getReceipt", getReceipt);
router.post("/getReceiptType", getReceiptType);
router.post("/getDocNo", getDocNo);
router.post("/getDivID", getDivID);
router.post("/saveReceipt", saveReceipt);
router.post("/modifyReceipt", modifyReceipt);

router.get("/attachments", getAttachments);
router.get("/attachments/file", getAttachmentFile);
router.post("/attachments/save", saveAttachments);

router.post("/get/data", GetDatas);

router.get("/get/data", GetDatas);
router.delete("/delete", DeleteReceipt);

router.get("/print", getReceiptPrint);
router.get("/excel", getReceiptExcel);
router.post("/post", applyReceiptPost);

export default router;
