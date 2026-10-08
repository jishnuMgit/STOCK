import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getUnitList,
  haveUnitTrans,
  saveUnit,
} from "../../../controller/Purchase/Setup/UnitPageController.js";

const router = express.Router();

router.get("/getUnitList", getUnitList);
router.get("/haveUnitTrans", haveUnitTrans);
// behind the session check: the save (new, renamed AND removed units) needs to
// know WHO is acting (idle, rights)
router.post("/saveUnit", authenticate, saveUnit);

export default router;
