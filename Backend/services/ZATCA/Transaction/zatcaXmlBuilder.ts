/* =========================================================
   ZATCA XML BUILDER - port of the eight supported Populate* functions in
   clsZATCAFileSubmission.vb (UblLarsen InvoiceType -> UBL 2.1 XML).

   The supported VB functions are the same document with a handful of differences,
   so they are expressed here as one builder driven by a small spec per kind:

     kind                  VB function                       data proc  ICV attachment  Zero-rated subtotal
     cashInvoice           PopulateZATCACashInvoice          SI         no              yes
     invoice               PopulateZATCAInvoice              SI         yes             yes
     cashRefundNote        PopulateZATCACashRefundNote       SR         no              yes
     refundCreditNote      PopulateZATCARefundCreditNote     SR         yes             yes
     standardDebitNote     PopulateZATCASTANDARDDebitNote    DNCN       yes             yes
     simplifiedDebitNote   PopulateZATCASIMPLIFIEDDebitNote  DNCN       no              yes
     standardCreditNote    PopulateZATCASTANDARDCreditNote   DNCN       yes             yes
     simplifiedCreditNote  PopulateZATCASIMPLIFIEDCreditNote DNCN       no              yes

   Elements are written in UBL 2.1 schema sequence order (the .NET serializer
   did this for the VB code), which differs from the order the VB properties
   were assigned in (e.g. CitySubdivisionName comes BEFORE CityName).
========================================================= */

export type Row = Record<string, unknown>;

export type DataProc = "SI" | "SR" | "DNCN";

export type InvoiceKind =
  | "cashInvoice"
  | "invoice"
  | "cashRefundNote"
  | "refundCreditNote"
  | "standardDebitNote"
  | "simplifiedDebitNote"
  | "standardCreditNote"
  | "simplifiedCreditNote";

type HeaderStyle = "invoice" | "refund" | "note";

type KindSpec = {
  proc: DataProc;
  header: HeaderStyle;
  icvAttachment: boolean;
  zeroRatedSubtotal: boolean;
};

export const KIND_SPECS: Record<InvoiceKind, KindSpec> = { 
  cashInvoice: { proc: "SI", header: "invoice", icvAttachment: false, zeroRatedSubtotal: true }, 
  invoice: { proc: "SI", header: "invoice", icvAttachment: true, zeroRatedSubtotal: true },
  cashRefundNote: { proc: "SR", header: "refund", icvAttachment: false, zeroRatedSubtotal: true },
  refundCreditNote: { proc: "SR", header: "refund", icvAttachment: true, zeroRatedSubtotal: true },
  standardDebitNote: { proc: "DNCN", header: "note", icvAttachment: true, zeroRatedSubtotal: true },
  simplifiedDebitNote: { proc: "DNCN", header: "note", icvAttachment: false, zeroRatedSubtotal: true },
  standardCreditNote: { proc: "DNCN", header: "note", icvAttachment: true, zeroRatedSubtotal: true },
  simplifiedCreditNote: { proc: "DNCN", header: "note", icvAttachment: false, zeroRatedSubtotal: true },
};

/* ---------- which builder (the If/ElseIf ladder in CreateZATCAFile) ---------- */

export function pickInvoiceKind(
  customerType: string,
  docType: string
): InvoiceKind {
  const b2c = customerType === "B2C"; // anything else is built as a standard (B2B) document

  switch (docType) {
    case "SI":
      return b2c ? "cashInvoice" : "invoice";
    case "SR":
      return b2c ? "cashRefundNote" : "refundCreditNote";
    case "DN":
      return b2c ? "simplifiedDebitNote" : "standardDebitNote";
    case "CN":
      return b2c ? "simplifiedCreditNote" : "standardCreditNote";
    default:
      throw new Error(`Unsupported document type for ZATCA: ${docType}`);
  }
}

/* ---------- value helpers (objCommon.NullorEmpty2Space / NullorEmpty20) ---------- */

// DB rows come back with lower-case column names; the VB used mixed case
const lowerKeys = (r: Row): Row =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]));

const pad = (n: number) => String(n).padStart(2, "0");

const str = (x: unknown): string => (x == null ? "" : String(x).trim());

const num = (x: unknown): number => {
  if (x == null || x === "") return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};

// String.Format("{0:#0.00}", x)
const amt = (x: unknown): string => {
  const s = num(x).toFixed(2);
  return s === "-0.00" ? "0.00" : s;
};

// String.Format("{0:#0}", x)
const pct0 = (x: unknown): string => String(Math.round(num(x)));

// decimal quantity, no forced decimals
const qty = (x: unknown): string => String(parseFloat(num(x).toFixed(6)));

const bool = (x: unknown): string => {
  if (typeof x === "boolean") return String(x);
  const s = str(x).toLowerCase();
  return s === "true" || s === "1" ? "true" : "false";
};

const dateOf = (x: unknown): string => {
  if (x instanceof Date) return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  const s = str(x);
  return /\d{4}-\d{2}-\d{2}/.exec(s)?.[0] ?? s;
};

// IssueTime, already cut to HH:mm:ss (what RearrangeXML did with Substring(0, 8))
const timeOf = (x: unknown): string => {
  if (x instanceof Date) return `${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
  return /(\d{2}:\d{2}:\d{2})/.exec(str(x))?.[1] ?? "";
};

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

type Attrs = Record<string, string | undefined>;

const attrText = (a?: Attrs): string =>
  a
    ? Object.entries(a)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ` ${k}="${esc(v as string)}"`)
        .join("")
    : "";

// element with text
const t = (name: string, value: string, attrs?: Attrs): string =>
  `<${name}${attrText(attrs)}>${esc(value)}</${name}>`;

// element with text, left out when empty (optional UBL elements)
const opt = (name: string, value: string, attrs?: Attrs): string =>
  value === "" ? "" : t(name, value, attrs);

// element with child markup
const w = (name: string, inner: string, attrs?: Attrs): string =>
  `<${name}${attrText(attrs)}>${inner}</${name}>`;

const b64 = (s: string): string => Buffer.from(s, "utf8").toString("base64");

/* ---------- builder ---------- */

export type BuildOptions = {
  uuid: string; // GenerateUUID()
  counterValue: number; // ICV
  previousInvoiceHash: string; // PIH (GetZATCAPIH)
  /**
   * The VB passed the PIH string as a Byte() array, which the .NET serializer
   * then base64-encodes. true (default) keeps that behaviour. Set false if your
   * dbo.getzatcapih already returns the exact text that belongs in the XML.
   */
  pihEncodeAsBase64?: boolean;
};

export function buildInvoiceXml(kind: InvoiceKind, rows: Row[], opts: BuildOptions): string {
  if (!rows.length) throw new Error("No data returned for the document");

  const spec = KIND_SPECS[kind];
  const data = rows.map(lowerKeys);
  const h = data[0];
  const g = (name: string) => h[name.toLowerCase()];
  // NOTE: sp_pagezatcasi / sp_pagezatcasr return the discount as "fdiscamaftvat"
  // (no "t"), the VB expected "fDiscAmtAFTVAT"; both spellings are accepted below.
  const cur = str(g("fCurrency"));
  const money = (name: string, v: unknown) => t(name, amt(v), { currencyID: cur });

  const isNote = spec.header === "note";
  const hasInstruction = spec.header !== "invoice";

  const issueDate = dateOf(isNote ? g("fSUserDate") : g("fInvDate"));
  const issueTime = timeOf(isNote ? g("fSUserDateTime") : g("fInvTime"));
  const deliveryDate = dateOf(isNote ? g("fDate") : g("fInvDate"));
  const qrField = spec.header === "invoice" ? "fInvQRDetails" : spec.header === "refund" ? "fRcnQRDetails" : "fQRDetails";
  const billingRefField = spec.header === "refund" ? "fRefNo" : isNote ? "fInvRcnNo" : null;

  /* ----- invoice lines ----- */
  const L = isNote
    ? { id: "fSlNo", ext: "fBillingAmtWoVAT", tax: "fInvLineTaxAmt", round: "fInvLineRoundingAmt", name: "fDocNo", price: "fBillingAmtWoVAT" }
    : { id: "fInvSlNo", ext: "fItemPriceWoVAT", tax: "fItemVATAmt", round: "fItemPrice", name: "fItemID", price: "fNetUnitPrice" };

  const lines = data
    .map((r) => {
      const c = (name: string) => r[name.toLowerCase()];
      const lc = str(c("fCurrency"));
      const m = (name: string, v: unknown) => t(name, amt(v), { currencyID: lc });
      return w(
        "cac:InvoiceLine",
        t("cbc:ID", String(Math.trunc(num(c(L.id))))) +
          t("cbc:InvoicedQuantity", qty(c("fInvoicedQty")), { unitCode: str(c("fUnit")) }) +
          m("cbc:LineExtensionAmount", c(L.ext)) +
          w("cac:TaxTotal", m("cbc:TaxAmount", c(L.tax)) + m("cbc:RoundingAmount", c(L.round))) +
          w(
            "cac:Item",
            t("cbc:Name", str(c(L.name))) +
              w(
                "cac:ClassifiedTaxCategory",
                t("cbc:ID", str(c("fClassifiedTaxCategory"))) +
                  t("cbc:Percent", amt(c("fClassifiedVATPer"))) +
                  w("cac:TaxScheme", t("cbc:ID", "VAT"))
              )
          ) +
          w("cac:Price", m("cbc:PriceAmount", c(L.price)))
      );
    })
    .join("");

  /* ----- additional document references: ICV, PIH, QR ----- */
  const pih = opts.pihEncodeAsBase64 === false ? opts.previousInvoiceHash : b64(opts.previousInvoiceHash);

  const icv = w(
    "cac:AdditionalDocumentReference",
    t("cbc:ID", "ICV") +
      t("cbc:UUID", String(opts.counterValue)) +
      (spec.icvAttachment
        ? w("cac:Attachment", `<cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain"/>`)
        : "")
  );
  const pihRef = w(
    "cac:AdditionalDocumentReference",
    t("cbc:ID", "PIH") +
      w("cac:Attachment", t("cbc:EmbeddedDocumentBinaryObject", pih, { mimeCode: "text/plain" }))
  );
  const qrRef = w(
    "cac:AdditionalDocumentReference",
    t("cbc:ID", "QR") +
      w(
        "cac:Attachment",
        t("cbc:EmbeddedDocumentBinaryObject", b64(str(g(qrField))), { mimeCode: "text/plain" })
      )
  );

  /* ----- parties ----- */
  const supplier = w(
    "cac:AccountingSupplierParty",
    w(
      "cac:Party",
      w("cac:PartyIdentification", t("cbc:ID", str(g("fCRNo")), { schemeID: "CRN" })) +
        w(
          "cac:PostalAddress",
          t("cbc:StreetName", str(g("fStreetName"))) +
            t("cbc:BuildingNumber", str(g("fBuildingNo"))) +
            opt("cbc:CitySubdivisionName", str(g("fDistrict"))) +
            t("cbc:CityName", str(g("fCity"))) +
            t("cbc:PostalZone", str(g("fPostalCode"))) +
            opt("cbc:CountrySubentity", str(g("fCountry"))) +
            w("cac:Country", t("cbc:IdentificationCode", "SA"))
        ) +
        w("cac:PartyTaxScheme", t("cbc:CompanyID", str(g("fCoVATNo"))) + w("cac:TaxScheme", t("cbc:ID", "VAT"))) +
        w("cac:PartyLegalEntity", t("cbc:RegistrationName", str(g("fCoName"))))
    )
  );

  const customer = w(
    "cac:AccountingCustomerParty",
    w(
      "cac:Party",
      w(
        "cac:PostalAddress",
        t("cbc:StreetName", str(g("fCustStreetName"))) +
          opt("cbc:AdditionalStreetName", str(g("fCustAdditionalStreetName"))) +
          t("cbc:BuildingNumber", str(g("fCustBuildingNo"))) +
          opt("cbc:CitySubdivisionName", str(g("fCustDistrict"))) +
          t("cbc:CityName", str(g("fCustCity"))) +
          t("cbc:PostalZone", str(g("fCustPostalCode"))) +
          opt("cbc:CountrySubentity", str(g("fCustCountryName"))) +
          w("cac:Country", t("cbc:IdentificationCode", "SA"))
      ) +
        w("cac:PartyTaxScheme", t("cbc:CompanyID", str(g("fVATNo"))) + w("cac:TaxScheme", t("cbc:ID", "VAT"))) +
        w("cac:PartyLegalEntity", t("cbc:RegistrationName", str(g("fCustomerName"))))
    )
  );

  /* ----- delivery / payment ----- */
  const delivery = w("cac:Delivery", t("cbc:ActualDeliveryDate", deliveryDate));

  const paymentMeans = w(
    "cac:PaymentMeans",
    t("cbc:PaymentMeansCode", str(g("fPaymentMeansCode"))) +
      (hasInstruction ? opt("cbc:InstructionNote", str(g("fInstructionNote"))) : "")
  );

  /* ----- document level allowance / charge ----- */
  const allowance = (
    indicator: unknown,
    reasonCode: unknown,
    reason: unknown,
    amount: unknown,
    categoryId: unknown,
    percent: unknown
  ): string =>
    w(
      "cac:AllowanceCharge",
      t("cbc:ChargeIndicator", bool(indicator)) +
        opt("cbc:AllowanceChargeReasonCode", str(reasonCode)) +
        opt("cbc:AllowanceChargeReason", str(reason)) +
        money("cbc:Amount", amount) +
        w(
          "cac:TaxCategory",
          t("cbc:ID", str(categoryId), { schemeID: "UN/ECE 5305", schemeAgencyID: "6" }) +
            t("cbc:Percent", amt(percent)) +
            w(
              "cac:TaxScheme",
              t("cbc:ID", str(g("fTaxSchemeID")), { schemeID: "UN/ECE 5153", schemeAgencyID: "6" })
            )
        )
    );

  const allowanceCharges = isNote
    ? allowance(g("fChgIndicator"), g("fDiscChgReasonCode"), g("fDiscChgReason"), g("fDiscAmt"), g("fAllowanceChargeID"), g("fVATPer")) +
      allowance(g("fAllowanceChgIndicator"), g("fAllowanceChgReasonCode"), g("fAllowanceChgReason"), g("fAgencyCharge"), g("fAllowanceChargeID"), g("fVATPer"))
    : allowance(g("fChgIndicator"), g("fDiscChgReasonCode"), g("fDiscChgReason"), g("fDiscAmtAFTVAT") ?? g("fDiscAmAFTVAT"), g("fDiscChgReasonID"), g("fDiscChgVATPer"));

  /* ----- tax totals ----- */
  const standardSubtotal = w(
    "cac:TaxSubtotal",
    money("cbc:TaxableAmount", isNote ? g("fTotTaxableAmt") : g("fTaxableAmt")) +
      money("cbc:TaxAmount", g("fTotSCVATAmt")) +
      w(
        "cac:TaxCategory",
        t("cbc:ID", "S") + t("cbc:Percent", pct0(g("fVATPer"))) + w("cac:TaxScheme", t("cbc:ID", "VAT"))
      )
  );

  const zeroRatedSubtotal = spec.zeroRatedSubtotal
    ? w(
        "cac:TaxSubtotal",
        money("cbc:TaxableAmount", g("fZeroRatedAmt")) +
          money("cbc:TaxAmount", g("fZeroRatedTax")) +
          w(
            "cac:TaxCategory",
            t("cbc:ID", "Z") +
              t("cbc:Percent", amt(g("fZeroRatedVATPer"))) +
              opt("cbc:TaxExemptionReasonCode", str(g("fTaxExemptionCode"))) +
              opt("cbc:TaxExemptionReason", str(g("fTaxExemptionReason"))) +
              w("cac:TaxScheme", t("cbc:ID", "VAT"))
          )
      )
    : "";

  const taxTotals =
    w("cac:TaxTotal", money("cbc:TaxAmount", g("fTotSCVATAmt"))) +
    w("cac:TaxTotal", money("cbc:TaxAmount", g("fTotSCVATAmt")) + standardSubtotal + zeroRatedSubtotal);

  const legalMonetaryTotal = w(
    "cac:LegalMonetaryTotal",
    money("cbc:LineExtensionAmount", isNote ? g("fTotBillingAmtWOVAT") : g("fTotLineExtensionAmount")) +
      money("cbc:TaxExclusiveAmount", g("fTotBillingAmtWOVAT")) +
      money("cbc:TaxInclusiveAmount", g("fTotBillingAmt")) +
      money("cbc:AllowanceTotalAmount", g("fAllowanceTotalAmount")) +
      money("cbc:ChargeTotalAmount", g("fChargeTotalAmount")) +
      money("cbc:PrepaidAmount", g("fPrepaidAmount")) +
      money("cbc:PayableAmount", g("fTotBillingAmt"))
  );

  const billingReference = billingRefField
    ? w(
        "cac:BillingReference",
        w("cac:InvoiceDocumentReference", t("cbc:ID", str(g(billingRefField))))
      )
    : "";

  /* ----- document (UBL 2.1 sequence order) ----- */
  const body =
    t("cbc:UBLVersionID", "2.1") +
    t("cbc:ProfileID", str(g("fProfileID"))) +
    t("cbc:ID", str(g("fDocNo"))) +
    t("cbc:UUID", opts.uuid) +
    t("cbc:IssueDate", issueDate) +
    t("cbc:IssueTime", issueTime) +
    t("cbc:InvoiceTypeCode", str(g("fInvTypeCode")), { name: str(g("fInvTypeCodeName")) }) +
    t("cbc:DocumentCurrencyCode", cur) +
    t("cbc:TaxCurrencyCode", cur) +
    billingReference +
    icv +
    pihRef +
    qrRef +
    supplier +
    customer +
    delivery +
    paymentMeans +
    allowanceCharges +
    taxTotals +
    legalMonetaryTotal +
    lines;

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"` +
    ` xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"` +
    ` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"` +
    ` xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">` +
    body +
    `</Invoice>`
  );
}
