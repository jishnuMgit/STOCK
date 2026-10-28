import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import { getLookups } from "../../../controller/Purchase/Report/RptSupplierPurchaseController.js";

const router = express.Router();

router.get("/lookups", authenticate, getLookups); // branches of the user, the default one, suppliers

export default router;
