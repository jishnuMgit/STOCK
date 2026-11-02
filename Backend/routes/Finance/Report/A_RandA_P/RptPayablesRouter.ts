// routes/Finance/Report/RptPayablesRouter.ts
// Mount it as:  router.use("/RptPayables", RptPayablesRouter);
import { Router } from "express";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../../controller/Finance/Report/A_RandA_P/RptPayablesController.js";

const router = Router();

// TODO: add your auth middleware here, like the other report routers:
// router.use(authenticate);

router.get("/lookups", getLookups); // the user's branches + the regions
router.post("/print", getPrintData); // data for the preview, the printer and the PDF
router.post("/excel", getExcel); // the .xlsx file

export default router;
