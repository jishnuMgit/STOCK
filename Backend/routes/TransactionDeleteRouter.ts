import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { deleteTransaction } from "../controller/TransactionDeleteController.js";

const router = express.Router();

router.use(authenticate);

router.post("/", deleteTransaction);

export default router;
