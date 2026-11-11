import { Router } from "express";
import { getServerDate } from "../../controller/common/DateTimeController.js";

const router = Router();

router.get("/server-date", getServerDate);

export default router;
