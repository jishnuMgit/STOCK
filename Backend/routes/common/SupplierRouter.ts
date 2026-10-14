import express from "express";
import {
  getSupplierLookupById,
  getSupplierLookupByName,
} from "../../controller/common/SupplierController.js";
import { authenticate } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/by-id", authenticate, getSupplierLookupById);
router.get("/by-name", authenticate, getSupplierLookupByName);

export default router;
