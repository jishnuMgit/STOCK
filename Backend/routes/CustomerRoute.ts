import { Router } from "express";
import {
  getCustomerList,
  getNextCSAccountId,
  getParentAccountReceivables,
} from "../controller/CustomerController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getCustomerList);
router.get("/next-id", getNextCSAccountId);
router.get("/parent-accounts", getParentAccountReceivables);

export default router;
