import express from "express";
import {
  getCostCenters,
  checkCostCenterUsed,
  saveCostCenters,
} from "../controller/CostCenterController.js";

const router = express.Router();

router.get("/", getCostCenters); // load the grid
router.get("/used/:id", checkCostCenterUsed); // do transactions use this one?
router.post("/", saveCostCenters); // Save / Modify (inserts, changes, deletes)

export default router;

