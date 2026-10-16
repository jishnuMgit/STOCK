// controller/CompanyController.ts
import { Request, Response } from "express";
import {
  ApiError,
  getCompanies as loadCompanies,
  getCompany as loadCompany,
  getPurchaseGroups as loadPurchaseGroups,
  saveCompany as saveCompanyData,
  deleteCompany as deleteCompanyData,
} from "../services/CompanyService.js";

type AuthRequest = Request & { user?: { id?: string } };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// GET /api/company  -> the list of companies
export const getCompanies = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const companies = await loadCompanies();
    return res.status(200).json({ success: true, companies });
  } catch (error: unknown) {
    console.error("Get companies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: errMsg(error),
    });
  }
};

// GET /api/company/:id  -> Search button
export const getCompany = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const company = await loadCompany(String(req.params.id ?? ""));

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    return res.status(200).json({ success: true, company });
  } catch (error: unknown) {
    console.error("Get company error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load company",
      error: errMsg(error),
    });
  }
};

// POST /api/company  -> Save button (insert when originalCoID is empty, else update)
export const saveCompany = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  const userId = req.user?.id ?? null; // replace with your auth/session user

  try {
    const mode = await saveCompanyData({ ...(req.body ?? {}), userId });

    return res.status(200).json({
      success: true,
      message: mode === "S" ? "Saved" : "Modified",
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    console.error("Save company error:", error);

    const code = (error as { code?: string }).code;
    return res.status(500).json({
      success: false,
      message: code === "23505" ? "Company ID already exists" : errMsg(error),
    });
  }
};

// DELETE /api/company/:id  -> Delete button
export const deleteCompany = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    await deleteCompanyData(String(req.params.id ?? ""));
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: unknown) {
    console.error("Delete company error:", error);
    return res.status(500).json({
      success: false,
      message: errMsg(error),
    });
  }
};

// GET /api/companies/purchase-groups  -> Purchase Expense Group dropdown
export const getPurchaseGroups = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const groups = await loadPurchaseGroups();
    return res.status(200).json({ success: true, groups });
  } catch (error: unknown) {
    console.error("Get purchase groups error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load purchase expense groups",
      error: errMsg(error),
    });
  }
};
