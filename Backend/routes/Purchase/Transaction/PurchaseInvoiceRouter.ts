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
  getNextDocNo,
  getPIExpAccounts,
  getPIExpCostCenters,
  getPIExpCurrencies,
  getPIExpLookups,
} from "../../../controller/Purchase/Transaction/PurchaseInvoiceController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getPurchaseInvoice);
router.post("/", savePurchaseInvoice);
router.delete("/", deletePurchaseInvoice);
router.post("/calc-unit-cost", calcUnitCost);
router.get("/next-doc-no", getNextDocNo);

// cash (misc.) supplier
router.get("/cash-supplier", getCashSuppliers);
router.get("/cash-supplier/next-id", getNextCashSupplierId); // keep above "/:id"
router.get("/cash-supplier/:id", getCashSupplier);
router.post("/cash-supplier", saveCashSupplier);
router.delete("/cash-supplier/:id", deleteCashSupplier);

// purchase expense (frmPIExp) lookups
router.get("/expense/accounts", getPIExpAccounts);
router.get("/expense/cost-centers", getPIExpCostCenters);
router.get("/expense/currencies", getPIExpCurrencies);
router.get("/expense/lookups", getPIExpLookups);

export default router;
