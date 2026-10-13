// routes/customerCountryRoutes.ts
import { Router } from "express";
import {
  getCountries,
  checkCountryUsed,
  saveCountries,
} from "../../../controller/Finance/Setup/CustomerSupplierCountryController.js"

const router = Router();

router.get("/", getCountries);
router.get("/used/:id", checkCountryUsed);
router.post("/", saveCountries);

export default router;

