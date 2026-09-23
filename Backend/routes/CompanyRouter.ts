import express from "express";
import { getCompanies } from "../controller/CompanyController.js";

const router = express.Router();

router.get("/", getCompanies);

export default router;
