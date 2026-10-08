import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { getUserBranches } from "../../controller/common/BranchController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getUserBranches);

export default router;
