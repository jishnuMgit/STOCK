import express from "express";

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
router.post("/saveItem", saveItem);
router.delete("/deleteItem", deleteItem);
router.delete("/deleteItemBranchRow", deleteItemBranchRow);

export default router;
