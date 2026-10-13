import { Router } from "express";
import { getAccounts, modifyStatus } from "../../../controller/Finance/Setup/InactivateAccountController.js";

const router = Router();

router.get("/", getAccounts);
router.post("/", modifyStatus);

export default router;