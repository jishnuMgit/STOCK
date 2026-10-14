import express from "express";
import {
  getCSaccounts,
  GetData,
  getDocumentsToMatchController,
  saveMatch,
  getMatchDate,
} from "../controller/MatchController.js";

const router = express.Router();

router.get("/getCSAccounts", getCSaccounts);
router.post("/getMatchAccounts", GetData);
router.post("/getDocumentsToMatch", getDocumentsToMatchController);
router.post("/saveMatch", saveMatch);
router.post("/getMatchDate", getMatchDate);

export default router;
