import express from "express";
import {
  getCompanies,
  getCompany,
  saveCompany,
  deleteCompany,  
  getYearClosingMethods,
} from "../controller/CompanyController.js";


const router = express.Router();

router.get("/", getCompanies);
router.get("/year-closing-methods", getYearClosingMethods); // before "/:id"
router.get("/:id", getCompany);
router.post("/", saveCompany);
router.delete("/:id", deleteCompany);

export default router;
