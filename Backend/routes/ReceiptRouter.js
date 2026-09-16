import express from "express";
import { getReceipt ,getReceiptType,getDocNo,getDivID,saveReceipt,modifyReceipt,testget,GetDatas} from "../controller/ReceiptController.js";

const router = express.Router();

router.get("/getReceipt", getReceipt);//getReceipt
router.post("/getReceiptType", getReceiptType);//getReceiptType getReceiptCashORBank
router.post("/getDocNo", getDocNo);//getDocNo  getReceiptDocNumber
router.post("/getDivID", getDivID);//getDivID getCustomerDivisions
router.post("/saveReceipt", saveReceipt);//
router.post("/modifyReceipt", modifyReceipt);//modifyReceipt  updateReceipt
// router.get("/saveReceipt", testget);
router.post('/get/data',GetDatas)//getReceipt
router.get('/get/data', GetDatas)

export default router;