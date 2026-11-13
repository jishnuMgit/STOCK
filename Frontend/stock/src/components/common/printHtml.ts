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
