import React, { useEffect, useMemo, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type {
  TDocumentDefinitions,
  Content,
  TableCell,
} from "pdfmake/interfaces";
import logo from "./global-network.png";

/* =========================================================
   ARABIC FONTS
   ========================================================= */

const arabicRegularFontUrl = new URL(
  "../../../../assets/fonts/NotoNaskhArabic-Regular.ttf",
  import.meta.url
).href;

const arabicMediumFontUrl = new URL(
  "../../../../assets/fonts/NotoNaskhArabic-Medium.ttf",
  import.meta.url
).href;

const arabicSemiBoldFontUrl = new URL(
  "../../../../assets/fonts/NotoNaskhArabic-SemiBold.ttf",
  import.meta.url
).href;

const arabicBoldFontUrl = new URL(
  "../../../../assets/fonts/NotoNaskhArabic-Bold.ttf",
  import.meta.url
).href;

pdfMake.addVirtualFileSystem(pdfFonts);

pdfMake.addFonts({
  Roboto: {
    normal:
      "https://unpkg.com/pdfmake@0.3/build/fonts/Roboto/Roboto-Regular.ttf",
    bold:
      "https://unpkg.com/pdfmake@0.3/build/fonts/Roboto/Roboto-Medium.ttf",
    italics:
      "https://unpkg.com/pdfmake@0.3/build/fonts/Roboto/Roboto-Italic.ttf",
    bolditalics:
      "https://unpkg.com/pdfmake@0.3/build/fonts/Roboto/Roboto-MediumItalic.ttf",
  },

  ArabicFont: {
    normal: arabicRegularFontUrl,
    bold: arabicBoldFontUrl,
    italics: arabicMediumFontUrl,
    bolditalics: arabicSemiBoldFontUrl,
  },
});

/* =========================================================
   TYPES
========================================================= */

interface ReceiptTransaction {
  accountId: string;
  accountName: string;
  description: string;
  creditAmount: number;
}

interface ReceiptPrintProps {
  receivedFrom?: string;
  receiptNo?: string;
  date?: string;
  reference?: string;
  fop?: string;
  currency?: string;
  amountInFigures?: number;
  amountInWords?: string;
  description?: string;
  transactions?: ReceiptTransaction[];
  preparedBy?: string;
  preparedDate?: string;
  checkedBy?: string;
  approvedBy?: string;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

/* =========================================================
   HELPERS
========================================================= */

const formatAmount = (value?: number) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const imageToDataUrl = async (src: string): Promise<string> => {
  const response = await fetch(src);

  if (!response.ok) {
    throw new Error(`Unable to load receipt logo. HTTP ${response.status}`);
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to convert receipt logo to data URL."));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Unable to read receipt logo."));
    };

    reader.readAsDataURL(blob);
  });
};

/* =========================================================
   DOCUMENT BUILDER
========================================================= */

const buildReceiptDocument = async (
  props: ReceiptPrintProps
): Promise<TDocumentDefinitions> => {
  const {
    receivedFrom = "",
    receiptNo = "",
    date = "",
    reference = "",
    fop = "",
    currency = "SAR",
    amountInFigures = 0,
    amountInWords = "",
    description = "",
    transactions = [],
    preparedBy = "",
    preparedDate = "",
    checkedBy = "",
    approvedBy = "",
  } = props;

  /* =========================================================
     LOGO
  ========================================================= */

  let logoDataUrl = "";

  try {
    logoDataUrl = await imageToDataUrl(logo);
  } catch (error) {
    console.warn(
      "Receipt logo could not be loaded. PDF will be generated without the logo.",
      error
    );
  }

  /* =========================================================
     RECEIPT INFORMATION HELPERS
  ========================================================= */

  const createInfoRow = (
    label: string,
    value: string,
    bold = false,
    margin: [number, number, number, number] = [0, 0, 0, 5]
  ): Content => ({
    columns: [
      {
        text: label,
        width: 108,
        fontSize: 8,
        noWrap: true,
      },
      {
        text: ":",
        width: 7,
        alignment: "center",
        fontSize: 8,
      },
      {
        text: value,
        width: 175,
        fontSize: 8,
        bold,
        noWrap: false,
      },
    ],
    margin,
  });

  const createRightInfoRow = (
    label: string,
    value: string,
    bold = false
  ): Content => ({
    columns: [
      {
        text: label,
        width: 63,
        fontSize: 8,
        noWrap: true,
      },
      {
        text: ":",
        width: 7,
        alignment: "center",
        fontSize: 8,
      },
      {
        text: value,
        width: 145,
        fontSize: 8,
        bold,
        noWrap: false,
      },
    ],
    margin: [0, 0, 0, 5],
  });

  /* =========================================================
     COMPANY HEADER
     This is used as the PDF header, so it repeats on every page.
  ========================================================= */

  const logoContent: Content = logoDataUrl
    ? {
        image: logoDataUrl,
        width: 75,
        alignment: "center",
        margin: [0, 0, 0, 0],
      }
    : {
        text: "CARAVAN",
        alignment: "center",
        bold: true,
        fontSize: 13,
        margin: [0, 10, 0, 10],
      };

 const companyHeader: Content = {
  table: {
    // Total = 555pt, matching the A4 content width
    widths: [230, 95, 220],

    heights: () => 108,

    body: [
      [
        // =====================================================
        // ENGLISH SIDE
        // =====================================================
        {
          stack: [
            {
              text: "CARAVAN TOURS & TRAVEL COMPANY",
              bold: true,
              fontSize: 10.5,
              noWrap: true,
              margin: [0, 0, 0, 4],
            },
            {
              text: "8442 , AL MADINAH AL MUNAWARAH ROAD",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "Postal Code : 23526 , AL NMAI DISTRICT , JEDDAH",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "KINGDOM OF SAUDI ARABIA - CR No. 4030130099",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "VAT Number : 300220164600003",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "Telephone : +966 126060018",
              fontSize: 7.2,
              noWrap: true,
            },
          ],

          margin: [10, 7, 0, 0],
        },

        // =====================================================
        // LOGO
        // =====================================================
        {
          stack: [logoContent],
          alignment: "center",
          margin: [0, 8, 0, 0],
        },

        // =====================================================
        // ARABIC SIDE
        // =====================================================
        {
          stack: [
            {
              text: "شركة القافلة للسياحة والسفر",
              font: "ArabicFont",
              alignment: "right",
              fontSize: 12.5,
              noWrap: true,
              margin: [0, 0, 0, 4],
              marginRight:10,
            },
            {
              text: "طريق المدينة المنورة 8442",
              font: "ArabicFont",
              alignment: "right",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "جدة - حي النعيم - الرمز البريدي 23526",
              font: "ArabicFont",
              alignment: "right",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "المملكة العربية السعودية - سجل تجاري : 4030130099",
              font: "ArabicFont",
              alignment: "right",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "الرقم الضريبي : 300220164600003",
              font: "ArabicFont",
              alignment: "right",
              fontSize: 7.2,
              noWrap: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: "هاتف : 00966126060018",
              font: "ArabicFont",
              alignment: "right",
              fontSize: 7.2,
              noWrap: true,
            },
          ],

          marginRight:17,
        },
      ],
    ],
  },

  layout: "noBorders",

  margin: [0, 0, 0, 4],
};

  const title: Content = {
    text: "BANK RECEIPT",
    alignment: "center",
    bold: false,
    fontSize: 12,
    margin: [0, 0, 0, 14],
  };

  /* =========================================================
     RECEIPT INFORMATION
     No vertical divider between left/right sections.
  ========================================================= */

  const leftInfoStack: Content[] = [
    createInfoRow("Received With thanks From", receivedFrom, true),
    createInfoRow("Currency", currency),
    createInfoRow("Amount In Figures", formatAmount(amountInFigures)),
    createInfoRow(
      "Amount In Words",
      amountInWords ? `( ${amountInWords} )` : ""
    ),
    createInfoRow("Description", description, false, [0, 0, 0, 0]),
  ];

  const rightInfoStack: Content[] = [
    createRightInfoRow("Receipt No.", receiptNo, true),
    createRightInfoRow("Date", date),
    createRightInfoRow("Reference", reference),
    createRightInfoRow("FOP", fop),
  ];

  const receiptInfo: Content = {
    table: {
      widths: [312, 223],
      heights: () => 213,
      body: [
        [
          {
            stack: leftInfoStack,
            margin: [7, 7, 7, 5],
          },
          {
            stack: rightInfoStack,
            margin: [7, 7, 7, 5],
          },
        ],
      ],
    },

    layout: {
      // Outer top/bottom border only.
      hLineWidth: () => 0.8,

      // Keep outer left/right borders, remove center divider.
      vLineWidth: (i: number, node: any) => {
        if (i === 0 || i === node.table.widths.length) {
          return 0.8;
        }

        return 0;
      },

      hLineColor: () => "#333333",
      vLineColor: () => "#333333",

      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },

    margin: [0, 0, 0, 0],
  };

  /* =========================================================
     TOTAL
  ========================================================= */

  const transactionTotal = transactions.reduce(
    (sum, transaction) =>
      sum + (Number(transaction.creditAmount) || 0),
    0
  );

  /* =========================================================
     TRANSACTION TABLE

     - 7 rows maximum per page.
     - No horizontal lines between transaction data rows.
     - Vertical column lines remain.
     - Header line remains.
     - Total is added only on the final transaction page.
  ========================================================= */

  const createTransactionTable = (
    chunk: ReceiptTransaction[],
    includeTotal: boolean
  ): Content => {
    const body: TableCell[][] = [
      [
        {
          text: "Account ID",
          fontSize: 8,
          alignment: "left",
        },
        {
          text: "Account Name / Description",
          fontSize: 8,
          alignment: "left",
        },
        {
          text: "Credit Amount",
          fontSize: 8,
          alignment: "right",
        },
      ],
    ];

    chunk.forEach((transaction) => {
  body.push([
    {
      text: transaction.accountId || "",
      fontSize: 8,
      alignment: "left",
    },

    {
      stack: [
        {
          text: transaction.accountName || "",
          fontSize: 8,
          noWrap: false,
        },

        ...(transaction.description
          ? [
              {
                text: transaction.description,
                fontSize: 8,
                noWrap: false,
                margin: [0, 4, 0, 0] as [
                  number,
                  number,
                  number,
                  number
                ],
              },
            ]
          : []),
      ],
    },

    {
      text: formatAmount(transaction.creditAmount),
      fontSize: 8,
      alignment: "right",
    },
  ]);
});

    if (includeTotal) {
      body.push([
        {
          text: "Total :",
          colSpan: 2,
          fontSize: 8,
          alignment: "right",
        },
        {},
        {
          text: formatAmount(transactionTotal),
          fontSize: 8,
          alignment: "right",
        },
      ]);
    }

    return {
    table: {
  headerRows: 1,
  widths: [94, 330, 80],

  heights: (rowIndex: number) => {
    // Header
    if (rowIndex === 0) {
      return 20;
    }

    // Every transaction row
    return 30;
  },

  body,
},

      layout: {
        /*
         * Horizontal lines:
         *
         * 0   = top border
         * 1   = header/data separator
         * data rows = NO horizontal lines
         * last = bottom border
         */
        hLineWidth: (i: number, node: any) => {
          if (i === 0) {
            return 0.7;
          }

          if (i === 1) {
            return 0.7;
          }

          if (i === node.table.body.length) {
            return 0.7;
          }

          return 0;
        },

        // Keep all vertical column borders.
        vLineWidth: () => 0.7,

        hLineColor: () => "#333333",
        vLineColor: () => "#333333",

        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },

      margin: [0, 0, 0, 0],
    };
  };

  /* =========================================================
     SPLIT TRANSACTIONS

     7 rows per page:

     Page 1:
       1 - 7

     Page 2:
       8 - 14

     etc.
  ========================================================= */

  const TRANSACTIONS_PER_PAGE = 7;

  const transactionChunks: ReceiptTransaction[][] = [];

  for (
    let i = 0;
    i < transactions.length;
    i += TRANSACTIONS_PER_PAGE
  ) {
    transactionChunks.push(
      transactions.slice(i, i + TRANSACTIONS_PER_PAGE)
    );
  }

  /* =========================================================
     APPROVAL FOOTER

     Only appears after the final transaction page.
  ========================================================= */

  const approvalFooter: Content = {
    table: {
      widths: [215, 160, 160],
      heights: () => 72,

      body: [
        [
          {
            stack: [
              {
                text: "Prepared By :",
                fontSize: 8,
              },
              {
                text: preparedBy,
                fontSize: 8,
                margin: [0, 10, 0, 0],
              },
              {
                text: preparedDate,
                fontSize: 7.5,
                margin: [0, 2, 0, 0],
              },
            ],
            margin: [6, 25, 6, 5],
          },

          {
            stack: [
              {
                text: "Checked By :",
                fontSize: 8,
              },
              {
                text: checkedBy,
                fontSize: 8,
                margin: [0, 10, 0, 0],
              },
            ],
            margin: [6, 25, 6, 5],
          },

          {
            stack: [
              {
                text: "Approved By :",
                fontSize: 8,
              },
              {
                text: approvedBy,
                fontSize: 8,
                margin: [0, 10, 0, 0],
              },
            ],
            margin: [6, 25, 6, 5],
          },
        ],
      ],
    },

    layout: {
      // hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      hLineColor: () => "#333333",
      vLineColor: () => "#333333",

      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },

    margin: [0, 0, 0, 0],
  };

  /* =========================================================
     CONTENT

     First page:
       Receipt information
       Transactions 1-7

     Second page:
       Transactions 8-14

     etc.

     Header is repeated automatically by pdfmake.
  ========================================================= */

  const content: Content[] = [];

  // Receipt information appears only once.
  content.push(receiptInfo);

  /*
   * If there are no transactions, still show an empty
   * transaction table and the approval footer.
   */
  if (transactionChunks.length === 0) {
    content.push(createTransactionTable([], true));

    content.push({
      text: "",
      margin: [0, 5, 0, 0],
    });

    content.push(approvalFooter);
  } else {
    transactionChunks.forEach((chunk, index) => {
      const isLastPage =
        index === transactionChunks.length - 1;

      /*
       * Every transaction page after page 1 starts
       * on a new PDF page.
       */
      if (index > 0) {
        content.push({
          text: "",
          pageBreak: "before",
        });
      }

      content.push(
        createTransactionTable(
          chunk,
          isLastPage
        )
      );

      /*
       * Approval footer only belongs to the final page.
       */
      if (isLastPage) {
        content.push({
          text: "",
          margin: [0, 5, 0, 0],
        });

        content.push(approvalFooter);
      }
    });
  }

  /* =========================================================
     FINAL DOCUMENT
  ========================================================= */

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "portrait",

    /*
     * Header is approximately 120-125pt high.
     * Give content enough top space so it doesn't overlap.
     */
    pageMargins: [30, 145, 20, 24],

    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
    },

    /*
     * COMMON HEADER
     *
     * This repeats automatically on every page.
     */
    header: {
      stack: [
        companyHeader,
        title,
      ],
      margin: [20, 20, 20, 0],
    },

    content,

    info: {
      title: `Bank Receipt ${receiptNo}`,
      subject: "Bank Receipt",
      author: "Stock",
      creator: "Stock",
    },
  };

  return docDefinition;
};

/* =========================================================
   COMPONENT
========================================================= */

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  receivedFrom = "",
  receiptNo = "",
  date = "",
  reference = "",
  fop = "",
  currency = "SAR",
  amountInFigures = 0,
  amountInWords = "",
  description = "",
  transactions = [],
  preparedBy = "",
  preparedDate = "",
  checkedBy = "",
  approvedBy = "",
  autoPrint = false,
  onPrintComplete,
}) => {
  const [isGenerating, setIsGenerating] =
    useState(false);

  const receiptProps = useMemo(
    () => ({
      receivedFrom,
      receiptNo,
      date,
      reference,
      fop,
      currency,
      amountInFigures,
      amountInWords,
      description,
      transactions,
      preparedBy,
      preparedDate,
      checkedBy,
      approvedBy,
    }),
    [
      receivedFrom,
      receiptNo,
      date,
      reference,
      fop,
      currency,
      amountInFigures,
      amountInWords,
      description,
      transactions,
      preparedBy,
      preparedDate,
      checkedBy,
      approvedBy,
    ]
  );

  /* =========================================================
     AUTO PRINT
  ========================================================= */

  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    let cancelled = false;

    const printTimer = window.setTimeout(
      async () => {
        try {
          setIsGenerating(true);

          console.log(
            "🖨️ OPENING PDF PRINT"
          );

          const docDefinition =
            await buildReceiptDocument(
              receiptProps
            );

          if (cancelled) {
            return;
          }

          console.log(
            "✅ PDF DOC DEFINITION CREATED",
            docDefinition
          );

          await pdfMake
            .createPdf(docDefinition)
            .print();

          console.log(
            "✅ PDF PRINT COMPLETED"
          );
        } catch (error) {
          console.error(
            "❌ PDF PRINT ERROR:",
            error
          );
        } finally {
          if (!cancelled) {
            setIsGenerating(false);
            onPrintComplete?.();
          }
        }
      },
      100
    );

    return () => {
      cancelled = true;
      window.clearTimeout(printTimer);
    };
  }, [
    autoPrint,
    receiptProps,
    onPrintComplete,
  ]);

  /* =========================================================
     OPEN PDF
  ========================================================= */

  const openPdf = async () => {
    try {
      setIsGenerating(true);

      const docDefinition =
        await buildReceiptDocument(
          receiptProps
        );

      await pdfMake
        .createPdf(docDefinition)
        .open();
    } catch (error) {
      console.error(
        "❌ PDF OPEN ERROR:",
        error
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadPdf = async () => {
    try {
      setIsGenerating(true);

      const docDefinition =
        await buildReceiptDocument(
          receiptProps
        );

      await pdfMake
        .createPdf(docDefinition)
        .download(
          `Receipt-${receiptNo || "Receipt"}.pdf`
        );
    } catch (error) {
      console.error(
        "❌ PDF DOWNLOAD ERROR:",
        error
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     HIDDEN AUTO PRINT COMPONENT
  ========================================================= */

  if (autoPrint) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={openPdf}
        disabled={isGenerating}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs"
      >
        {isGenerating
          ? "Generating..."
          : "Open PDF"}
      </button>

      <button
        type="button"
        onClick={downloadPdf}
        disabled={isGenerating}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs"
      >
        Download PDF
      </button>
    </div>
  );
};

export default ReceiptPrint;
