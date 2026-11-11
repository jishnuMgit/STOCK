import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  exportZATCAPDFA3,
  getLookups,
  getZATCAPDFA3Pending,
} from "../../../controller/ZATCA/Transaction/ZATCAPDFA3PendingController.js";

const router = express.Router();

// behind the session check: the branches shown depend on WHO is logged in
router.get("/getLookups", authenticate, getLookups);
// a POST: the filters travel in the body
router.post("/getZATCAPDFA3Pending", authenticate, getZATCAPDFA3Pending);
// the same body as above
router.post("/exportZATCAPDFA3", authenticate, exportZATCAPDFA3);

export default router;

// app: app.use("/api/zatca-pdfa3-pending", zatcaPdfA3PendingRouter);
