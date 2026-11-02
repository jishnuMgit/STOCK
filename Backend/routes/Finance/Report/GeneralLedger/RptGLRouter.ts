// routes/Finance/Report/RptGLRouter.ts
// Mount it as:  router.use("/RptGL", RptGLRouter);
import { Router } from "express";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../../controller/Finance/Report/GeneralLedger/RptGLController.js";

const router = Router();

// TODO: add your auth middleware here, like the other report routers:
// router.use(authenticate);

router.get("/lookups", getLookups); // branches, cost centers, accounts (by id / by name)
router.post("/print", getPrintData); // data for the preview, the printer and the PDF
router.post("/excel", getExcel); // the .xlsx file

export default router;
