/* =========================================================
   ZATCA GATEWAY - the part the VB code did with the .NET SDK
   (UblLarsen XML build + UblDoc.Save, SDKNETFrameWorkLib signing / hashing /
   QR, and the HTTPS clearance / reporting call).
   Implement submitToZatca with your signing library or a sidecar service.
   Until then every submit is reported as "not configured".
========================================================= */

export type ZatcaSubmitDocument = {
  brId: string;
  docType: string;
  origDocType?: string | null;
  docNo: string;
  invRcnType?: string | null;
  customerId: string;
  docDate: string; // yyyy-mm-dd
  invDateTime: string; // yyyy-mm-dd hh:mm:ss
};

export type ZatcaSubmitInput = {
  doc: ZatcaSubmitDocument;
  customerType: string; // B2B = clearance, otherwise reporting
  counterValue: number;
  previousInvoiceHash: string;
  privateKey: string;
  certificate: string;
  csrData: string;
  clearanceUrl: string;
  reportingUrl: string;
  binaryToken: string;
  secret: string;
  outputFolder: string;
};

export type ZatcaSubmitOutput = {
  status: "CLEARED" | "REPORTED" | "REJECTED";
  xmlHash?: string;
  invoiceHash?: string;
  qrCode?: string;
  message?: string;
};

export async function submitToZatca(
  _input: ZatcaSubmitInput
): Promise<ZatcaSubmitOutput> {
  throw new Error(
    "ZATCA gateway is not configured: implement submitToZatca (XML build, signing, ZATCA API call)"
  );
}
