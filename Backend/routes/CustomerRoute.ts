import { Router } from "express";
import { getCustomerList } from "../controller/CustomerController.js"; 

const router = Router();

router.get("/", getCustomerList);

export default router;