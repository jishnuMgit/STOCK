import express from "express";


import { authenticate } from "../../../../middleware/authMiddleware.js";
import { calcSalesInvoice, deleteSalesInvoice, getSalesInvoice, getSalesInvoiceLookups, postSalesInvoice, saveSalesInvoice } from "../../../../controller/Sales/Transaction/SalesInvoice/SalesInvoiceController.js";
import { getNextDocNo } from "../../../../controller/Purchase/Transaction/PurchaseInvoiceController.js";

const router = express.Router();

router.use(authenticate);

// invoice CRUD
router.get("/", getSalesInvoice);
router.post("/", saveSalesInvoice);
router.delete("/", deleteSalesInvoice);

// post
router.post("/post", postSalesInvoice);

// totals calculation (server-side port of CalcTotalPriceInclVAT)
router.post("/calc", calcSalesInvoice);

// next invoice no.
router.get("/next-doc-no", getNextDocNo);

// combos: customers, discount types, price levels, items
router.get("/lookups", getSalesInvoiceLookups);

export default router;
