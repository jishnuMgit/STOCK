import express from "express";
import ReceiptRouter from "./ReceiptRouter.js";
import MatchRouter from "./MatchRouter.js";
import LoginRouter from "./AuthRouter.js";
import CompanyRouter from "./CompanyRouter.js";
import YearRouter from "./YearRouter.js";
import CompanyInfoRouter from "./SettingRoutes/SetcompanyinfoRouter.js";
import SetDocumentNoRouter from "./SettingRoutes/SetdocumentnoRouter.js";
import SetBranchInfoRouter from "./SettingRoutes/SetBranchInfoRouter.js";
import customerRouter from "./CustomerRoute.js";
import menuRoutes from "./MenuRoute.js";
import ItemPageRouter from "./Purchase/Setup/ItemPageRouter.js";
import UserLoginRouter from "./SecurityRoutes/UserLoginRouter.js";
import userpermission from "./SettingRoutes/Userpermission.routes.js"
import userpermissionCoBranch from "./SettingRoutes/UserpermissionCoBranch.routes.js"

const router = express.Router();

router.use("/Receipt", ReceiptRouter);
router.use("/Match", MatchRouter);
router.use("/auth", LoginRouter);
router.use("/companies", CompanyRouter);
router.use("/years", YearRouter);
router.use("/CompanyInfo", CompanyInfoRouter);
router.use("/DocumentNo", SetDocumentNoRouter);
router.use("/BranchInfo", SetBranchInfoRouter);
router.use("/menu", menuRoutes);
router.use("/Item", ItemPageRouter);
router.use("/customer", customerRouter);
router.use("/UserLogin", UserLoginRouter);
router.use("/user-permission",userpermission)
router.use("/user-permission-cobranch",userpermissionCoBranch)

export default router;
