import express from "express";
import { getMe, login, logout } from "../controller/AuthController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
