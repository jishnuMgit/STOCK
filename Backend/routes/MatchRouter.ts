import express from "express";
import { getCSaccounts } from "../controller/MatchController.js";


const router = express.Router();

router.get("/getCSAccounts", getCSaccounts);


export default router;