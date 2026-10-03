import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getPostingAccountService,
  savePostingAccountService,
  postingAccountFields,
  type PostingAccountPayload,
} from "../../services/SettingServices/setPostingAccountService.js";
import { UserAudit } from "../../utils/UserAudit.js";
import { mapKeys, mapRows, branchListKeys, accountListKeys, postingAccountKeys } from "../../utils/responseKeys.js";

/* =========================================================
   GET BRANCH LIST (lkpBranch dropdown, filtered by
   dbo.userbranches — same as SetBranchInfo / SetDocumentNo)
========================================================= */

export const getBranchList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrUserID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT fbrid, fbrname
      FROM dbo.tblbranch
      WHERE fcoid = $1
        AND dbo.userbranches($1, $2, fbrid)
      ORDER BY fpositionno, fbrid
      `,
      [PstrCoID, PstrUserID]
    );

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, branchListKeys),
    });
  } catch (error: unknown) {
    console.error("getBranchList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET DEFAULT BRANCH (lkpBranch pre-select, live lookup)
========================================================= */

export const getDefaultBranch = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrUserID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await pool.query(
      `SELECT dbo.getuserdefbranch($1, $2) AS "defBranch"`,
      [PstrCoID, PstrUserID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0]?.defBranch || "",
    });
  } catch (error: unknown) {
    console.error("getDefaultBranch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load default branch",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET ACCOUNT LIST (the ID / Name dropdowns of every row;
   company only - tblaccount has no branch column)
========================================================= */

export const getAccountList = async (
  req: Request,
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

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillpostingaccount($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, accountListKeys),
    });
  } catch (error: unknown) {
    console.error("getAccountList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load account list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET POSTING ACCOUNT (mode 'G', prefill on branch select)
========================================================= */

export const getPostingAccount = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, lkpBranch } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const data = await getPostingAccountService(
      String(PstrCoID),
      String(lkpBranch)
    );

    // a branch that was never saved has no row yet - not an error
    return res.status(200).json({
      success: true,
      data: data ? mapKeys(data, postingAccountKeys) : null,
    });
  } catch (error: unknown) {
    console.error("getPostingAccount error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load posting accounts",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE POSTING ACCOUNT (mode 'S' or 'M')
========================================================= */

export const savePostingAccount = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      ...payload
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      lkpBranch: string;
    } & PostingAccountPayload = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const branchAccessResult = await pool.query(
      `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"`,
      [PstrCoID, PstrUserID, lkpBranch]
    );

    if (!branchAccessResult.rows[0]?.hasAccess) {
      return res.status(403).json({
        success: false,
        message: `User '${PstrUserID}' does not have access to Branch '${lkpBranch}'`,
      });
    }

    const { mode, before } = await savePostingAccountService(
      PstrCoID,
      lkpBranch,
      payload,
      PstrUserID
    );

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // the note lists each account that changed, old -> new
    // =====================================================

    try {
      const changed = postingAccountFields.filter(
        ({ field, column }) =>
          (before?.[column] ?? null) !== (payload[field] ?? null)
      );

      const accountIds = [
        ...new Set(
          changed
            .flatMap(({ field, column }) => [
              before?.[column] ?? null,
              payload[field] ?? null,
            ])
            .filter((id): id is string => !!id)
        ),
      ];

      const accountNameById = new Map<string, string>();

      if (accountIds.length > 0) {
        const accountResult = await pool.query(
          `SELECT faccountid, faccountname FROM dbo.tblaccount WHERE fcoid = $1 AND faccountid = ANY($2)`,
          [PstrCoID, accountIds]
        );

        for (const row of accountResult.rows) {
          accountNameById.set(row.faccountid, row.faccountname);
        }
      }

      const branchResult = await pool.query(
        `SELECT fbrname FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $2`,
        [PstrCoID, lkpBranch]
      );

      const branchName = branchResult.rows[0]?.fbrname || lkpBranch;

      const describe = (id: string | null) =>
        id ? `${id} ${accountNameById.get(id) ?? ""}`.trim() : "(none)";

      const details = changed
        .map(
          ({ field, column, label }) =>
            `${label}: ${describe(before?.[column] ?? null)} -> ${describe(payload[field] ?? null)}`
        )
        .join("; ");

      const note =
        mode === "S"
          ? `Inserted posting accounts for branch '${branchName}'${details ? ` (${details})` : ""}`
          : details
            ? `Updated posting accounts for branch '${branchName}': ${details}`
            : `Updated posting accounts for branch '${branchName}' (no changes)`;

      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        null,
        null,
        "Set Stock Posting Account",
        mode,
        PstrUserID,
        note
      );
    } catch (auditError: unknown) {
      // the posting accounts are already saved - don't fail the
      // request over an audit-logging problem, just log it
      console.error("UserAudit error (savePostingAccount):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Posting accounts saved successfully",
    });
  } catch (error: unknown) {
    console.error("savePostingAccount error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Posting accounts could not be saved",
    });
  }
};
