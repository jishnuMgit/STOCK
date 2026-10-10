import { Router } from "express";
import {
  getCustomerList,
  getNextCSAccountId,
  getParentAccountReceivables,
  getCustSupCountries,
  getStaffs,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controller/CustomerController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getCustomerList);
router.get("/next-id", getNextCSAccountId);
router.get("/parent-accounts", getParentAccountReceivables);
router.get("/countries", getCustSupCountries);
router.get("/staffs", getStaffs);

router.get("/:csAccountId", getCustomer);
router.post("/", createCustomer);
router.put("/:csAccountId", updateCustomer);
router.delete("/:csAccountId", deleteCustomer);

export default router;
