import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   GET BRANCH INFO (mode 'G')
========================================================= */

export async function getBranchInfoService(
  PstrCoID: string,
  lkpBranch: string
): Promise<any | null> {
  const client: PoolClient = await pool.connect();

  const cursorName =
    `cur_branchinfo_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  try {
    await client.query("BEGIN");

    await callSpBranchInfo(client, {
      strmode: "G",
      PstrCoID,
      lkpBranch,
      cursorName,
    });

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return result.rows[0] || null;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getBranchInfoService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE BRANCH INFO (mode 'M')
========================================================= */

export interface BranchInfoPayload {
  txtBrName_AR: string | null;
  txtBuildingNo: string | null;
  txtStreetName: string | null;
  txtDistrict: string | null;
  txtCity: string | null;
  txtCountry: string | null;
  txtPostalCode: string | null;
  txtAdditionalNo: string | null;
  txtCRNo: string | null;
  txtLicenseNo: string | null;
  txtLicenseCategory: string | null;
  txtBuildingNo_AR: string | null;
  txtStreetName_AR: string | null;
  txtDistrict_AR: string | null;
  txtCity_AR: string | null;
  txtCountry_AR: string | null;
  txtPostalCode_AR: string | null;
  txtAdditionalNo_AR: string | null;
  txtCRNo_AR: string | null;
  txtLicenseNo_AR: string | null;
  txtLicenseCategory_AR: string | null;
  txtBrAddress1: string | null;
  txtBrAddress2: string | null;
  txtBrAddress3: string | null;
  txtBrAddress4: string | null;
  txtBrAddress1_AR: string | null;
  txtBrAddress2_AR: string | null;
  txtBrAddress3_AR: string | null;
  txtBrAddress4_AR: string | null;
  chkHo: boolean;
}

export async function saveBranchInfoService(
  PstrCoID: string,
  lkpBranch: string,
  payload: BranchInfoPayload,
  PstrUserID: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpBranchInfo(client, {
      strmode: "M",
      PstrCoID,
      lkpBranch,
      ...payload,
      PstrUserID,
    });

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveBranchInfoService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER — call dbo.sp_pagesetbranchinfo with sensible
   defaults for whichever fields a given mode doesn't use
========================================================= */

async function callSpBranchInfo(
  client: PoolClient,
  overrides: Partial<{
    strmode: string;
    PstrCoID: string;
    lkpBranch: string;
    txtBrName_AR: string | null;
    txtBuildingNo: string | null;
    txtStreetName: string | null;
    txtDistrict: string | null;
    txtCity: string | null;
    txtCountry: string | null;
    txtPostalCode: string | null;
    txtAdditionalNo: string | null;
    txtCRNo: string | null;
    txtLicenseNo: string | null;
    txtLicenseCategory: string | null;
    txtBuildingNo_AR: string | null;
    txtStreetName_AR: string | null;
    txtDistrict_AR: string | null;
    txtCity_AR: string | null;
    txtCountry_AR: string | null;
    txtPostalCode_AR: string | null;
    txtAdditionalNo_AR: string | null;
    txtCRNo_AR: string | null;
    txtLicenseNo_AR: string | null;
    txtLicenseCategory_AR: string | null;
    txtBrAddress1: string | null;
    txtBrAddress2: string | null;
    txtBrAddress3: string | null;
    txtBrAddress4: string | null;
    txtBrAddress1_AR: string | null;
    txtBrAddress2_AR: string | null;
    txtBrAddress3_AR: string | null;
    txtBrAddress4_AR: string | null;
    chkHo: boolean;
    PstrUserID: string | null;
    cursorName: string;
  }>
): Promise<void> {
  const p = {
    strmode: null,
    PstrCoID: null,
    lkpBranch: null,
    txtBrName_AR: null,
    txtBuildingNo: null,
    txtStreetName: null,
    txtDistrict: null,
    txtCity: null,
    txtCountry: null,
    txtPostalCode: null,
    txtAdditionalNo: null,
    txtCRNo: null,
    txtLicenseNo: null,
    txtLicenseCategory: null,
    txtBuildingNo_AR: null,
    txtStreetName_AR: null,
    txtDistrict_AR: null,
    txtCity_AR: null,
    txtCountry_AR: null,
    txtPostalCode_AR: null,
    txtAdditionalNo_AR: null,
    txtCRNo_AR: null,
    txtLicenseNo_AR: null,
    txtLicenseCategory_AR: null,
    txtBrAddress1: null,
    txtBrAddress2: null,
    txtBrAddress3: null,
    txtBrAddress4: null,
    txtBrAddress1_AR: null,
    txtBrAddress2_AR: null,
    txtBrAddress3_AR: null,
    txtBrAddress4_AR: null,
    chkHo: false,
    PstrUserID: null,
    cursorName:
      `cur_branchinfo_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ...overrides,
  };

  await client.query(
    `
    CALL dbo.sp_pagesetbranchinfo(
      $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
      $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar,
      $11::varchar, $12::varchar, $13::varchar, $14::varchar, $15::varchar,
      $16::varchar, $17::varchar, $18::varchar, $19::varchar, $20::varchar,
      $21::varchar, $22::varchar, $23::varchar, $24::varchar, $25::varchar,
      $26::varchar, $27::varchar, $28::varchar, $29::varchar, $30::varchar,
      $31::varchar, $32::varchar, $33::boolean, $34::varchar, $35::refcursor
    )
    `,
    [
      p.strmode, p.PstrCoID, p.lkpBranch, p.txtBrName_AR, p.txtBuildingNo,
      p.txtStreetName, p.txtDistrict, p.txtCity, p.txtCountry, p.txtPostalCode,
      p.txtAdditionalNo, p.txtCRNo, p.txtLicenseNo, p.txtLicenseCategory, p.txtBuildingNo_AR,
      p.txtStreetName_AR, p.txtDistrict_AR, p.txtCity_AR, p.txtCountry_AR, p.txtPostalCode_AR,
      p.txtAdditionalNo_AR, p.txtCRNo_AR, p.txtLicenseNo_AR, p.txtLicenseCategory_AR, p.txtBrAddress1,
      p.txtBrAddress2, p.txtBrAddress3, p.txtBrAddress4, p.txtBrAddress1_AR, p.txtBrAddress2_AR,
      p.txtBrAddress3_AR, p.txtBrAddress4_AR, p.chkHo, p.PstrUserID, p.cursorName,
    ]
  );
}
