import pool from "../DB/db.js";

export const UserAudit = async (
  PstrCoID: string,
  PstrYear: string,
  lkpBranch: string,
  Type: string,
  txtReceiptNo: string,
  strscreenname: string,
  straction: string,
  PstrUserID: string,
  receiptDate: string,
  cbAccountName: string,
  receivedFrom: string,
  creditAmount: number
) => {
  try {
    const gstrUserAuditNote =
      `Date : ${receiptDate}\n` +
      `Cash/Bank Account Name: ${cbAccountName}\n` +
      `Received From : ${receivedFrom}\n` +
      `Amount : ${creditAmount}`;

    await pool.query(
      `CALL dbo.sp_useraudit(
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )`,
      [
        PstrCoID,
        PstrYear,
        lkpBranch,
        Type,
        txtReceiptNo,
        strscreenname,
        straction,
        gstrUserAuditNote,
        PstrUserID,
      ]
    );

    console.log("+++++++++++++++++++++++++")
    console.log("gstrUserAuditNote",gstrUserAuditNote)

    return {
      success: true,
      note: gstrUserAuditNote,
    };
  } catch (error) {
    console.error("UserAudit Error:", error);
    throw error;
  }
};