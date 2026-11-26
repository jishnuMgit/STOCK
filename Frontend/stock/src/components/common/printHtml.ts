// printHtml.ts
// What the report print files (the Beginning Balance, Stock Transfer ... reports)
// share: the text escapers of their HTML, and the browser print dialog opened from a
// hidden iframe (no pop-up to be blocked).

export const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// text placed inside a CSS string ("...") in the print stylesheet
export const cssStr = (v: unknown) =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\3C ")
    .replace(/[\r\n]+/g, " ");

// The Print Preview shows the page on screen, and a browser draws the @page margin boxes ("Page x / y", "Printed : ...")
// only when it prints. So the preview shows the user and the time itself: this returns the preview's extra CSS and the
// line "Printed : ..." (bottom right, in the font of the page's own margin box), taken from the page's @bottom-right rule.
// Put the style before </head> and the line before </body>; a page without a "Printed" rule gets nothing.
export const previewPrintedLine = (html: string): { css: string; line: string } => {
  const rule = /@bottom-right\s*\{\s*content:\s*"Printed : ((?:[^"\\]|\\.)*)";\s*font:\s*([^;}]+);/.exec(html);
  if (!rule) return { css: "", line: "" };

  // undo cssStr(): \3C = "<", \" = ", \\ = \
  const text = rule[1]
    .replace(/\\3C /g, "<")
    .replace(/\\(["\\])/g, "$1");

  return {
    css: `.preview-printed{text-align:right;margin:16px 0 8px;font:${rule[2]};color:#000}`,
    line: `<div class="preview-printed">Printed : ${esc(text)}</div>`,
  };
};

// The preview also shows "Page x of y" - a browser draws it (the page's @top-right margin box) only when it prints. This returns
// the label for the preview: at the right end of the Branch line (the first td.sub / td.info / td.br of the page - where the PDF
// and the printed page put it), in the font of the page's own margin box. The label starts as "Page 1 of 1"; the preview puts
// the real number of pages in it (the class "preview-page"). A page without a "Page" margin box gets nothing.
export const previewPageNumber = (html: string): { css: string; label: string; script: string } => {
  const rule = /@top-right\s*\{\s*content:\s*"Page "[^;]*;\s*font:\s*([^;}]+);/.exec(html);
  if (!rule) return { css: "", label: "", script: "" };

  return {
    css: `.preview-page{position:absolute;right:20px;top:0;visibility:hidden;font:${rule[1]};color:#000}`,
    label: `<div class="preview-page">Page 1 of 1</div>`,
    script:
      `<script>(function(){var p=document.querySelector('.preview-page');var e=document.querySelector('td.sub,td.info,td.br');` +
      `if(!p||!e)return;p.style.top=(e.getBoundingClientRect().top+window.scrollY)+'px';p.style.visibility='visible';})();</script>`,
  };
};

// How many pages a PDF made by jsPDF has: every page object is "/Type /Page" (the page tree is "/Type /Pages")
export const countPdfPages = async (blob: Blob): Promise<number> => {
  const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
};

// A report in the app font (Inter) loads it itself, in its own CSS. The print dialog must not open before the font is
// there, or the page would print in the fallback font: wait for the page to load, then for the font, but never longer than
// a few seconds (offline: the fallback font prints).
const FONT_WAIT_MS = 3000;

const whenWebFontReady = (win: Window): Promise<void> =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    setTimeout(finish, FONT_WAIT_MS);

    const waitForFonts = () => {
      const fonts = win.document.fonts;
      if (!fonts) return finish();

      Promise.all([fonts.load('9pt "Inter"'), fonts.load('bold 9pt "Inter"')])
        .then(() => fonts.ready)
        .then(finish, finish);
    };

    if (win.document.readyState === "complete") waitForFonts();
    else win.addEventListener("load", waitForFonts, { once: true });
  });

export const printHtmlDocument = (html: string): void => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Could not open the print view");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);

  const openPrintDialog = () => {
    win.focus();
    win.print();
    // some browsers never fire afterprint: remove it anyway after a minute
    setTimeout(() => iframe.remove(), 60000);
  };

  // let the iframe lay out before printing - and, for a page in the Inter font, let the font arrive
  setTimeout(() => {
    if (html.includes('"Inter"')) void whenWebFontReady(win).then(openPrintDialog);
    else openPrintDialog();
  }, 250);
};

// Prints a PDF file (what jsPDF made) through the browser's print window, from a hidden iframe. The PDF has the page
// number, the branch and the report info exactly where the report puts them (a browser can draw "Page x of y" only in
// the page margin when it prints a web page, never on the branch line).
export const printPdfBlob = (blob: Blob): Promise<void> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";

    const cleanup = () => {
      iframe.remove();
      URL.revokeObjectURL(url);
    };

    iframe.onload = () => {
      // the browser's PDF viewer needs a moment after the load before it can print
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve();
          // some browsers never say when the printing is over: remove it after a minute
          setTimeout(cleanup, 60000);
        } catch (error) {
          cleanup();
          reject(error);
        }
      }, 500);
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("Could not open the PDF"));
    };

    iframe.src = url;
    document.body.appendChild(iframe);
  });
