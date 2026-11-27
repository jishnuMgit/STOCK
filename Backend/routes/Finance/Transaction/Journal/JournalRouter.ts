import { Router } from "express";

import {
    getJournal,
    getJournalTypes,
    getJournalLookups,
    getJournalDocNo,
    saveJournal,
    updateJournal,
    deleteJournal,
    postJournal,
} from "../../../../controller/Finance/Transaction/Journal/JournalController.js";
import { authenticate } from "../../../../middleware/authMiddleware.js";
import { requireReceiptContext } from "../../../../middleware/receiptContext.js";

const router = Router();

router.use(authenticate);

/* company / year / user from the frontend (same as receipt) */
router.use(requireReceiptContext);

router.get("/types", getJournalTypes);

router.get("/lookups", getJournalLookups);

router.get("/next-doc-no", getJournalDocNo);

router.get("/", getJournal);

router.post("/", saveJournal);

router.put("/", updateJournal);

router.post("/post", postJournal);

router.delete("/", deleteJournal);

export default router;