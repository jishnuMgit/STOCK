import { Router } from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";

import {
  createChartOfAccount,
  deleteChartOfAccount,
  getChartOfAccount,
  getChartOfAccountTree,
  getNextAccountId,
  updateChartOfAccount,
} from "../../../controller/Finance/Setup/COAController.js";

const router = Router();

router.use(authenticate);

router.get("/", getChartOfAccountTree);
router.get("/next-id", getNextAccountId); // keep above "/:accountId"

router.get("/:accountId", getChartOfAccount);
router.post("/", createChartOfAccount);
router.put("/:accountId", updateChartOfAccount);
router.delete("/:accountId", deleteChartOfAccount);

export default router;
