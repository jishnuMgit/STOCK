import express from "express";
import { getYears } from "../controller/YearController.js";

const router = express.Router();

router.get("/", getYears);

export default router;
