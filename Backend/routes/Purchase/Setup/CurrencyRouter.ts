import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getCurrencies,
  checkCurrencyUsed,
  saveCurrencies,
} from "../../../controller/Purchase/Setup/CurrencyController.js";

const router = express.Router();

router.use(authenticate);
router.get("/", getCurrencies);
router.get("/used/:id", checkCurrencyUsed);
router.post("/", saveCurrencies);

export default router;
