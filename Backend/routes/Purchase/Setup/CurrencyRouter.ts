
import { Router } from "express";
import {
  getCurrencies,
  checkCurrencyUsed,
  saveCurrencies,
} from "../../../controller/Purchase/Setup/CurrencyController.js";
import { authenticate } from "../../../middleware/authMiddleware.js";

const router = Router();
// router.use(authenticate);
router.get("/", getCurrencies);
router.get("/used/:id", checkCurrencyUsed);
router.post("/", saveCurrencies);

export default router;


