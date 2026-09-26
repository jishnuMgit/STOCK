import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   GET BRANCH INFO (mode 'G')
========================================================= */

export async function getBranchInfoService(
  CoID: string,
  lkpBranch: string
): Promise<any | null> {
  const client: PoolClient = await pool.connect();

  const cursorName =
    `cur_branchinfo_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  try {
    await client.query("BEGIN");

    await callSpBranchInfo(client, {
      strmode: "G",
      coid: CoID,
      brid: lkpBranch,
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
  CoID: string,
  lkpBranch: string,
  payload: BranchInfoPayload,
  userId: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpBranchInfo(client, {
      strmode: "M",
      coid: CoID,
      brid: lkpBranch,
      brname_ar: payload.txtBrName_AR,
      buildingno: payload.txtBuildingNo,
      streetname: payload.txtStreetName,
      district: payload.txtDistrict,
      city: payload.txtCity,
      country: payload.txtCountry,
      postalcode: payload.txtPostalCode,
      additionalno: payload.txtAdditionalNo,
      crno: payload.txtCRNo,
      licenseno: payload.txtLicenseNo,
      licensecategory: payload.txtLicenseCategory,
      buildingno_ar: payload.txtBuildingNo_AR,
      streetname_ar: payload.txtStreetName_AR,
      district_ar: payload.txtDistrict_AR,
      city_ar: payload.txtCity_AR,
      country_ar: payload.txtCountry_AR,
      postalcode_ar: payload.txtPostalCode_AR,
      additionalno_ar: payload.txtAdditionalNo_AR,
      crno_ar: payload.txtCRNo_AR,
      licenseno_ar: payload.txtLicenseNo_AR,
      licensecategory_ar: payload.txtLicenseCategory_AR,
      braddress1: payload.txtBrAddress1,
      braddress2: payload.txtBrAddress2,
      braddress3: payload.txtBrAddress3,
      braddress4: payload.txtBrAddress4,
      braddress1_ar: payload.txtBrAddress1_AR,
      braddress2_ar: payload.txtBrAddress2_AR,
      braddress3_ar: payload.txtBrAddress3_AR,
      braddress4_ar: payload.txtBrAddress4_AR,
      ho: payload.chkHo,
      userid: userId,
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
   SHARED HELPER — call dbo.sp_setbranchinfo with sensible
   defaults for whichever fields a given mode doesn't use
========================================================= */

async function callSpBranchInfo(
  client: PoolClient,
  overrides: Partial<{
    strmode: string;
    coid: string;
    brid: string;
    brname_ar: string | null;
    buildingno: string | null;
    streetname: string | null;
    district: string | null;
    city: string | null;
    country: string | null;
    postalcode: string | null;
    additionalno: string | null;
    crno: string | null;
    licenseno: string | null;
    licensecategory: string | null;
    buildingno_ar: string | null;
    streetname_ar: string | null;
    district_ar: string | null;
    city_ar: string | null;
    country_ar: string | null;
    postalcode_ar: string | null;
    additionalno_ar: string | null;
    crno_ar: string | null;
    licenseno_ar: string | null;
    licensecategory_ar: string | null;
    braddress1: string | null;
    braddress2: string | null;
    braddress3: string | null;
    braddress4: string | null;
    braddress1_ar: string | null;
    braddress2_ar: string | null;
    braddress3_ar: string | null;
    braddress4_ar: string | null;
    ho: boolean;
    userid: string | null;
    cursorName: string;
  }>
): Promise<void> {
  const p = {
    strmode: null,
    coid: null,
    brid: null,
    brname_ar: null,
    buildingno: null,
    streetname: null,
    district: null,
    city: null,
    country: null,
    postalcode: null,
    additionalno: null,
    crno: null,
    licenseno: null,
    licensecategory: null,
    buildingno_ar: null,
    streetname_ar: null,
    district_ar: null,
    city_ar: null,
    country_ar: null,
    postalcode_ar: null,
    additionalno_ar: null,
    crno_ar: null,
    licenseno_ar: null,
    licensecategory_ar: null,
    braddress1: null,
    braddress2: null,
    braddress3: null,
    braddress4: null,
    braddress1_ar: null,
    braddress2_ar: null,
    braddress3_ar: null,
    braddress4_ar: null,
    ho: false,
    userid: null,
    cursorName:
      `cur_branchinfo_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ...overrides,
  };

  await client.query(
    `
    CALL dbo.sp_setbranchinfo(
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
      p.strmode, p.coid, p.brid, p.brname_ar, p.buildingno,
      p.streetname, p.district, p.city, p.country, p.postalcode,
      p.additionalno, p.crno, p.licenseno, p.licensecategory, p.buildingno_ar,
      p.streetname_ar, p.district_ar, p.city_ar, p.country_ar, p.postalcode_ar,
      p.additionalno_ar, p.crno_ar, p.licenseno_ar, p.licensecategory_ar, p.braddress1,
      p.braddress2, p.braddress3, p.braddress4, p.braddress1_ar, p.braddress2_ar,
      p.braddress3_ar, p.braddress4_ar, p.ho, p.userid, p.cursorName,
    ]
  );
}
