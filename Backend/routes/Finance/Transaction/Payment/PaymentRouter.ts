import express from "express";

import {
    getPayment,
    getPaymentDocNo,
    savePayment,
    modifyPayment,
    GetPaymentDatas,
    DeletePayment,
} from "../../../../controller/Finance/Transaction/Payment/PaymentController.js";

/* Generic handlers shared with the receipt module:
   - getReceiptType : cash / bank account lookup (type C / B)
   - getDivID       : customer divisions lookup
   - applyReceiptPost : posting (frontend sends lkpDocType = BP / CP) */
import {
    getReceiptType,
    getDivID,
    applyReceiptPost,
} from "../../../../controller/ReceiptController.js";

import { requireReceiptContext } from "../../../../middleware/receiptContext.js";
import { getAttachmentFile, getAttachments, saveAttachments } from "../../../../controller/common/AttachementController.js";

const router = express.Router();

router.use(requireReceiptContext);
router.get("/getPayment", getPayment);
router.post("/getPaymentType", getReceiptType);
router.post("/getDocNo", getPaymentDocNo);
router.post("/getDivID", getDivID);
router.post("/savePayment", savePayment);
router.post("/modifyPayment", modifyPayment);

router.get("/attachments", getAttachments);
router.get("/attachments/file", getAttachmentFile);
router.post("/attachments/save", saveAttachments);

router.get("/get/data", GetPaymentDatas);
router.post("/get/data", GetPaymentDatas);

router.delete("/delete", DeletePayment);

router.post("/post", applyReceiptPost);

export default router;