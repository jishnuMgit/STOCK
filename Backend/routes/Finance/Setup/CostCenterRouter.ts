import express from "express";
import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getCostCenters,
  checkCostCenterUsed,
  saveCostCenters,
} from "../../../controller/Finance/Setup/CostCenterController.js";

const router = express.Router();
// router.use(authenticate);
router.get("/", getCostCenters); // load the grid
router.get("/used/:id", checkCostCenterUsed); // do transactions use this one?
router.post("/", saveCostCenters); // Save / Modify (inserts, changes, deletes)

export default router;

