import express from "express";
import {
  getCompanies,
  getCompany,
  saveCompany,
  deleteCompany,
} from "../controller/CompanyController.js";

const router = express.Router();

router.get("/", getCompanies);          // list all
router.get("/:id", getCompany);         // Search button
router.post("/", saveCompany);          // Save button (insert or update)
router.delete("/:id", deleteCompany);   // Delete button

export default router;
