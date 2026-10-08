import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getVATSlabList,
  getItemGroup,
  saveItemGroup,
  deleteItemGroup,
} from "../../../controller/Purchase/Setup/ItemGroupPageController.js";

const router = express.Router();

router.get("/getVATSlabList", getVATSlabList);
router.get("/getItemGroup", getItemGroup);
// behind the session check: save / delete need to know WHO is acting (idle, rights)
router.post("/saveItemGroup", authenticate, saveItemGroup);
router.delete("/deleteItemGroup", authenticate, deleteItemGroup);

export default router;
