import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

const CONTENT_LEFT_MM = 12;
const CONTENT_TOP_MM = 5;
const CONTENT_WIDTH_MM = 190.5;
const CONTENT_HEIGHT_MM = 288;

const PIXELS_PER_MM = 96 / 25.4;

export const buildReceiptPdf = async (
  previewRoot: HTMLElement,
): Promise<Blob> => {
  const sheets = Array.from(
    previewRoot.querySelectorAll<HTMLElement>(
      ".receipt-preview-sheet"
    )
  );

  if (sheets.length === 0) {
    throw new Error(
      "The receipt preview is not ready for PDF export."
    );
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM],
    compress: true,
  });

  for (const [index, sheet] of sheets.entries()) {
    const page = sheet.querySelector<HTMLElement>(
      ".receipt-page"
    );

    if (!page) {
      throw new Error(
        "A receipt page is missing from the preview."
      );
    }

    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 3,
      width: Math.ceil(CONTENT_WIDTH_MM * PIXELS_PER_MM),
      height: Math.ceil(CONTENT_HEIGHT_MM * PIXELS_PER_MM),
      useCORS: true,
      logging: false,
      onclone: (clonedDocument) => {
        const printLayout = clonedDocument.createElement("style");
        printLayout.textContent = `
          .receipt-preview-root {
            width: 190.5mm !important;
            margin: 0 !important;
            padding: 0 !important;
            zoom: 1 !important;
          }
          .receipt-doc {
            width: 190.5mm !important;
            background: #ffffff !important;
          }
          .receipt-preview-sheet {
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .receipt-page {
            width: 190.5mm !important;
            min-height: 288mm !important;
            margin: 0 !important;
            break-inside: avoid !important;
          }
            .receipt-th-label{
              margin-bottom: 15px;

            }
             .receipt-total-cell {
  
  padding: 3mm 2mm !important;
  height: 12mm;
  vertical-align: middle;
}
        `;
        clonedDocument.head.appendChild(printLayout);
      },
    });

    if (index > 0) {
      doc.addPage();
    }

    const imageData = canvas.toDataURL("image/png");

    doc.addImage(
      imageData,
      "PNG",
      CONTENT_LEFT_MM,
      CONTENT_TOP_MM,
      CONTENT_WIDTH_MM,
      CONTENT_HEIGHT_MM,
      undefined,
      "FAST",
    );

    // Release canvas memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return doc.output("blob");
};