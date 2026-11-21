import { Router } from "express";
import {
  getSupplierList,
  getNextCSAccountId,
  getParentAccountPayables,
  getCustSupCountries,
  getStaffs,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../../../../controller/Finance/Setup/Supplier/SupplierController.js";
import { authenticate } from "../../../../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getSupplierList);
router.get("/next-id", getNextCSAccountId);
router.get("/parent-accounts", getParentAccountPayables);
router.get("/countries", getCustSupCountries);
router.get("/staffs", getStaffs);

router.get("/:csAccountId", getSupplier);
router.post("/", createSupplier);
router.put("/:csAccountId", updateSupplier);
router.delete("/:csAccountId", deleteSupplier);

export default router;