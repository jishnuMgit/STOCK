import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  calcUnitCost,
  deletePurchaseInvoice,
  getPurchaseInvoice,
  savePurchaseInvoice,
} from "../../../controller/Purchase/Transaction/PurchaseInvoiceController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getPurchaseInvoice);
router.post("/", savePurchaseInvoice);
router.delete("/", deletePurchaseInvoice);
router.post("/calc-unit-cost", calcUnitCost);

export default router;
