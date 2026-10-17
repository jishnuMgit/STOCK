import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getVATSlabList,
  getItemGroup,
  saveItemGroup,
  deleteItemGroup,
} from "../../../controller/Purchase/Setup/ItemGroupController.js";

const router = express.Router();

router.get("/getVATSlabList", getVATSlabList);
router.get("/getItemGroup", getItemGroup);
router.post("/saveItemGroup", authenticate, saveItemGroup);
router.delete("/deleteItemGroup", authenticate, deleteItemGroup);

export default router;
