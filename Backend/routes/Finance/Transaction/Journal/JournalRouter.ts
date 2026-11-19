import { Router } from "express";

import {
    getJournal,
    saveJournal,
    updateJournal,
    deleteJournal,
} from "../../../../controller/Finance/Transaction/Journal/JournalController.js";
import { authenticate } from "../../../../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getJournal);

router.post("/", saveJournal);

router.put("/", updateJournal);

router.delete("/", deleteJournal);

export default router;