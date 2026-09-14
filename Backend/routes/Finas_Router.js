import express from "express";
import { ReceiptsControllers ,GetReceiptCashORBank,GetReceiptDocNumber,GetCustomerDivisions,saveReceipt,updateReceipt,testget,GetDatas} from "../controller/Finas_Controller.js";

const router = express.Router();

router.get("/getReceipts", ReceiptsControllers);
router.post("/getReceiptCashORBank", GetReceiptCashORBank);
router.post("/getReceiptDocNumber", GetReceiptDocNumber);
router.post("/getCustomerDivisions", GetCustomerDivisions);
router.post("/saveReceipt", saveReceipt);
router.post("/updateReceipt", updateReceipt);
router.get("/saveReceipt", testget);
router.post('/get/data',GetDatas)
router.get('/get/data', GetDatas)

export default router;