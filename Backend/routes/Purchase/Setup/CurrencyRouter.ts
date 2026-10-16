// routes/Purchase/Setup/CurrencyRouter.ts
import { Router } from "express";
import {
  getCurrencies,
  checkCurrencyUsed,
  saveCurrencies,
} from "../../../controller/Purchase/Setup/CurrencyController.js";

const router = Router();

router.get("/", getCurrencies);
router.get("/used/:id", checkCurrencyUsed);
router.post("/", saveCurrencies);

export default router;

// ---- in your app / server file (next to the CostCenter router) ----
//
//   import currencyRoutes from "./routes/Purchase/Setup/CurrencyRouter.js";
//   app.use("/api/Currency", currencyRoutes);
//
// ---- in your React router ----
//
//   <Route path="/currency" element={<CurrencyPage />} />
