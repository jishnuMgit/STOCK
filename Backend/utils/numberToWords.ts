/* =========================================================
   AMOUNT IN WORDS

   Produces the same wording that is printed on the existing
   receipts, e.g.

     438.75  ->  FOUR HUNDRED THIRTY EIGHT AND SEVENTY FIVE
                 HALALA ONLY
     1250    ->  ONE THOUSAND TWO HUNDRED FIFTY ONLY
========================================================= */

const ONES = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const TENS = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

const SCALES = ["", "THOUSAND", "MILLION", "BILLION", "TRILLION"];

/* 1 - 999 */
function belowThousand(value: number): string {
  const words: string[] = [];

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;

  if (hundreds > 0) {
    words.push(`${ONES[hundreds]} HUNDRED`);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      words.push(ONES[remainder]);
    } else {
      const tens = TENS[Math.floor(remainder / 10)];
      const ones = ONES[remainder % 10];

      words.push(ones ? `${tens} ${ones}` : tens);
    }
  }

  return words.join(" ");
}

/* 0 - 999,999,999,999,999 */
function integerToWords(value: number): string {
  if (value === 0) {
    return "ZERO";
  }

  const groups: string[] = [];

  let remaining = value;
  let scaleIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;

    if (chunk > 0) {
      const scale = SCALES[scaleIndex];

      groups.unshift(
        scale
          ? `${belowThousand(chunk)} ${scale}`
          : belowThousand(chunk)
      );
    }

    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  return groups.join(" ");
}

/**
 * @param amount   Amount as a number (2 decimals are used)
 * @param subUnit  Name of the fractional unit (SAR -> HALALA)
 */
export function amountToWords(
  amount: number,
  subUnit: string = "HALALA"
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  /* Work in the smallest unit to avoid floating point noise. */
  const totalSubUnits = Math.round(Math.abs(safeAmount) * 100);

  const whole = Math.floor(totalSubUnits / 100);
  const fraction = totalSubUnits % 100;

  const parts: string[] = [];

  if (whole > 0 || fraction === 0) {
    parts.push(integerToWords(whole));
  }

  if (fraction > 0) {
    parts.push(
      `${whole > 0 ? "AND " : ""}${integerToWords(fraction)} ${subUnit}`
    );
  }

  parts.push("ONLY");

  return `${totalSubUnits > 0 && safeAmount < 0 ? "MINUS " : ""}${parts.join(" ")}`;
}
