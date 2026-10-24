import type { NextFunction, Request, Response } from "express";

export interface ReceiptContext {
  pstrCoID: string;
  pstrYear: string;
  pstrUserID: string;
}

export const requireReceiptContext = (
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  const pstrCoID = String(req.header("x-co-id") ?? "").trim();
  const pstrYear = String(req.header("x-year") ?? "").trim();
  const pstrUserID = String(req.header("x-user-id") ?? "").trim();

  if (!pstrCoID || !pstrYear || !pstrUserID) {
    return res.status(400).json({
      success: false,
      message: "Company ID, financial year and user ID are required",
    });
  }

  res.locals.ctx = { pstrCoID, pstrYear, pstrUserID } as ReceiptContext;

  next();
};
