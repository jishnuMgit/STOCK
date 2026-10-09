import express from "express";
import {
  getCompanies,
  getCompany,
  saveCompany,
  deleteCompany,
  getPurchaseGroups,
} from "../controller/CompanyController.js";

const router = express.Router();

router.get("/", getCompanies);
router.get("/purchase-groups", getPurchaseGroups); // before "/:id"
router.get("/:id", getCompany);
router.post("/", saveCompany);
router.delete("/:id", deleteCompany);

export default router;
