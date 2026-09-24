import { Router } from "express";
import { getMenus } from "../controller/MenuController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authenticate, getMenus);

export default router;