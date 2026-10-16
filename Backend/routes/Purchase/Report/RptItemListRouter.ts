// routes/Stock/Report/RptItemListRouter.ts
import express from "express";
import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getLookups,
  getPrintData,
} from "../../../controller/Purchase/Report/RptItemListController.js";

const router = express.Router();
// router.use(authenticate);
router.get("/lookups", getLookups); // branches, item groups, items
router.post("/print", getPrintData); // rows for the printed report

export default router;

// ---- in routes/index.ts, mount it like the other report routers:
//
//   import RptItemListRouter from "./Stock/Report/RptItemListRouter.js";
//   router.use("/RptItemList", RptItemListRouter);
