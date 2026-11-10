import express from "express";

import { authenticate } from "../../../../middleware/authMiddleware.js";
import {
  calcSalesInvoice,
  deleteSalesInvoice,
  getSalesInvoice,
  getSalesInvoiceLookups,
  getSalesInvoiceTypes,
  getSalesItemStock,
  postSalesInvoice,
  saveSalesInvoice,
} from "../../../../controller/Sales/Transaction/SalesInvoice/SalesInvoiceController.js";
import { getNextDocNo } from "../../../../controller/Sales/Transaction/SalesInvoice/SalesInvoiceController.js";

const router = express.Router();

router.use(authenticate);

// invoice CRUD
router.get("/", getSalesInvoice);
router.post("/", saveSalesInvoice);
router.delete("/", deleteSalesInvoice);
router.get("/item-stock", getSalesItemStock);

// post
router.post("/post", postSalesInvoice);

// totals calculation (server-side port of CalcTotalPriceInclVAT)
router.post("/calc", calcSalesInvoice);

// next invoice no.
router.get("/next-doc-no", getNextDocNo);

//invoice types
router.get("/invoice-types", getSalesInvoiceTypes);

// combos: customers, discount types, price levels, items
router.get("/lookups", getSalesInvoiceLookups);

export default router;
