import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  calcUnitCost,
  deletePurchaseInvoice,
  getPurchaseInvoice,
  savePurchaseInvoice,
  getCashSuppliers,
  getNextCashSupplierId,
  getCashSupplier,
  saveCashSupplier,
  deleteCashSupplier,
} from "../../../controller/Purchase/Transaction/PurchaseInvoiceController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getPurchaseInvoice);
router.post("/", savePurchaseInvoice);
router.delete("/", deletePurchaseInvoice);
router.post("/calc-unit-cost", calcUnitCost);

// cash (misc.) supplier
router.get("/cash-supplier", getCashSuppliers);
router.get("/cash-supplier/next-id", getNextCashSupplierId); // keep above "/:id"
router.get("/cash-supplier/:id", getCashSupplier);
router.post("/cash-supplier", saveCashSupplier);
router.delete("/cash-supplier/:id", deleteCashSupplier);

export default router;
