
import { Router, type RequestHandler } from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getUserIdList,
  getUserPermissions,
  getMenuStructure,
  saveUserPermissions,
  deleteUserPermissions,
} from "../../controller/SecurityController/UserPermissionMenuController.js";

const router = Router();

// must come before /:lkpUserID so "users" isn't read as a lkpUserID
router.get("/users/list", getUserIdList);

// also before /:lkpUserID, for the same reason
router.get("/structure", getMenuStructure);

router.get("/:lkpUserID", getUserPermissions);
// (typed handlers, so cast for the chain) behind the session check: save / delete need to know WHO is acting (idle, rights)
router.put("/:lkpUserID", authenticate, saveUserPermissions as unknown as RequestHandler);
router.delete("/:lkpUserID", authenticate, deleteUserPermissions as unknown as RequestHandler);

export default router;