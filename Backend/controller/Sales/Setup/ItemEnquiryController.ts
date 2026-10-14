import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { validateItemEnquiry } from "../../../validators/ItemEnquiryValidator.js";
import {
  getItemEnquiryItemListService,
  getItemEnquiryService,
} from "../../../services/Sales/Setup/itemEnquiryService.js";
import {
  mapRows,
  mapKeys,
  itemEnquiryItemKeys,
  itemEnquiryHeaderKeys,
  itemEnquiryGridKeys,
} from "../../../utils/responseKeys.js";

/* =========================================================
   GET ITEM LIST (the Item ID / Item Name boxes)
========================================================= */

export const getItemList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const data = await getItemEnquiryItemListService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      data: mapRows(data, itemEnquiryItemKeys),
    });
  } catch (error: unknown) {
    console.error("getItemList (item enquiry) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item list",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =========================================================
   GET ITEM ENQUIRY (the details of one item, and its branches)
   The stock and cost come from the login year's stock control rows.
========================================================= */

export const getItemEnquiry = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpItemID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d+$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // validators/ItemEnquiryValidator.ts: the user is not idle, the item exists
    const check = await validateItemEnquiry({
      PstrCoID,
      PstrUserID: req.user.userId,
      lkpItemID,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    const result = await getItemEnquiryService(
      String(PstrCoID),
      Number(PstrYear),
      String(lkpItemID)
    );

    return res.status(200).json({
      success: true,
      header: result.header
        ? mapKeys(result.header, itemEnquiryHeaderKeys)
        : null,
      data: mapRows(result.branches, itemEnquiryGridKeys),
    });
  } catch (error: unknown) {
    console.error("getItemEnquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the item enquiry",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
