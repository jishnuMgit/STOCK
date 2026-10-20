// routes/Sales/Report/RptSalesPriceListRouter.ts
// Mount it as:  app.use("/api/RptSalesPriceList", rptSalesPriceListRouter);
import { Router } from "express";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../controller/Purchase/Report/RptSalesPriceListController.js";

const router = Router();

// TODO: add your auth middleware here, like the other report routers:
// router.use(authMiddleware);

router.get("/lookups", getLookups); // the user's branches
router.post("/print", getPrintData); // data for the preview and the PDF
router.post("/excel", getExcel); // the .xlsx file

export default router;
