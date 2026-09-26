import express from "express";

import {
  getUnitList,
  getItemGroupList,
  getSupplierList,
} from "../../../controller/Purchase/Setup/ItemPageController.js";

const router = express.Router();

router.get("/getUnitList", getUnitList);
router.get("/getItemGroupList", getItemGroupList);
router.get("/getSupplierList", getSupplierList);

export default router;
