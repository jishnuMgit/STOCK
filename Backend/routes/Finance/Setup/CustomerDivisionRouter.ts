// routes/Finance/Setup/CustomerDivisionRouter.ts
// Mounted as /CustomerDivision in routes/index.ts. Every route is behind the session check: the company and the user
// come from WHO is logged in.
import { Router } from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  checkCustomerDivisionUsed,
  getCustomerDivisionLookups,
  getCustomerDivisions,
  saveCustomerDivisions,
} from "../../../controller/Finance/Setup/CustomerDivisionController.js";

const router = Router();

router.use(authenticate);

router.get("/getLookups", getCustomerDivisionLookups); // the customers that have divisions (Customer ID / Customer Name boxes)
router.post("/getDivisions", getCustomerDivisions); // the divisions of the chosen customer (the grid)
router.post("/used", checkCustomerDivisionUsed); // do transactions use this division?
router.post("/save", saveCustomerDivisions); // Save / Modify / Delete: the changed rows, in one transaction

export default router;
