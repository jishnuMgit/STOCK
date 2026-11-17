/*
   Payment document type helper  (utils/paymentDocType.ts)

   B  / BP -> BP  (Bank Payment)
   C  / CP -> CP  (Cash Payment)
*/
export function GetPaymentDocType(value: unknown): string {
    const type = String(value ?? "")
        .trim()
        .toUpperCase();

    if (type === "B" || type === "BP") return "BP";
    if (type === "C" || type === "CP") return "CP";

    return type;
}