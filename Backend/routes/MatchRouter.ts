import express from "express";
import { getCSaccounts,GetData,getDocumentsToMatchController } from "../controller/MatchController.js";


const router = express.Router();

router.get("/getCSAccounts", getCSaccounts);

router.post("/getMatchAccounts",GetData);

router.post("/getDocumentsToMatch", getDocumentsToMatchController);
export default router;