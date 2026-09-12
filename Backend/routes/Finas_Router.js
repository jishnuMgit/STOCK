import express from "express";
import { ReceiptsControllers ,GetReceiptCashORBank,GetReceiptDocNumber,GetCustomerDivisions,saveReceipt,testget} from "../controller/Finas_Controller.js";

const router = express.Router();

router.get("/getReceipts", ReceiptsControllers);
router.post("/getReceiptCashORBank", GetReceiptCashORBank);
router.post("/getReceiptDocNumber", GetReceiptDocNumber);
router.post("/getCustomerDivisions", GetCustomerDivisions);
router.post("/saveReceipt", saveReceipt);
router.get("/saveReceipt", testget);

export default router;