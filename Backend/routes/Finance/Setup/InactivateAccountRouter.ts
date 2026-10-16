import { Router } from "express";
import { getAccounts, modifyStatus } from "../../../controller/Finance/Setup/InactivateAccountController.js";
import { authenticate } from "../../../middleware/authMiddleware.js";
const router = Router();
// router.use(authenticate);
router.get("/", getAccounts);
router.post("/", modifyStatus);

export default router;