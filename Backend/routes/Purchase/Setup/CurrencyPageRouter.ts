// routes/Purchase/Setup/CurrencyPageRouter.ts
import { Router } from "express";
import {
  getCurrencies,
  checkCurrencyUsed,
  saveCurrencies,
} from "../../../controller/Purchase/Setup/CurrencyPageController.js";

const router = Router();

router.get("/", getCurrencies);
router.get("/used/:id", checkCurrencyUsed);
router.post("/", saveCurrencies);

export default router;

// ---- in your app / server file (next to the CostCenter router) ----
//
//   import currencyRoutes from "./routes/Purchase/Setup/CurrencyPageRouter.js";
//   app.use("/api/Currency", currencyRoutes);
//
// ---- in your React router ----
//
//   <Route path="/currency" element={<CurrencyPage />} />
