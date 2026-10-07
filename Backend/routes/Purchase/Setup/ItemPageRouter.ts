import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";

import {
  getUnitList,
  getItemGroupList,
  getSupplierList,
  getBranchList,
  getItem,
  saveItem,
  deleteItem,
  deleteItemBranchRow,
} from "../../../controller/Purchase/Setup/ItemPageController.js";

const router = express.Router();

router.get("/getUnitList", getUnitList);
router.get("/getItemGroupList", getItemGroupList);
router.get("/getSupplierList", getSupplierList);
router.get("/getBranchList", getBranchList);
router.get("/getItem", getItem);
// behind the session check: save / delete need to know WHO is acting (rights)
router.post("/saveItem", authenticate, saveItem);
router.delete("/deleteItem", authenticate, deleteItem);
router.delete("/deleteItemBranchRow", authenticate, deleteItemBranchRow);

export default router;
