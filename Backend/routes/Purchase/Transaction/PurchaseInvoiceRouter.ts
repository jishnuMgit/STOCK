import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js"; 
import {
  deletePurchaseInvoice,
  getPurchaseInvoice,
  savePurchaseInvoice,
} from "../../../controller/Purchase/Transaction/PurchaseInvoiceController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getPurchaseInvoice);
router.post("/", savePurchaseInvoice);
router.delete("/", deletePurchaseInvoice);

export default router;
