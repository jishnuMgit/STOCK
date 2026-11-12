// zatcaPdfA3Html.ts
// Draws one ZATCA document (tax invoice / return / credit note / debit note) as an A3
// landscape HTML page from a layout spec (zatcaPdfA3Layouts.ts, taken from the VB
// DevExpress reports). The browser lays out the Arabic text (shaping + right-to-left),
// so no font tricks are needed here. The PDF is made from this HTML by the export service.
//
// Report units are 1/100 inch on A4 landscape; A3 landscape is exactly sqrt(2) bigger,
// so every length and font size is multiplied by K.
import type { Band, BoxItem, Cell, Font, Item, Layout, TableItem } from "./zatcaPdfA3Layouts.js";

export const K = Math.SQRT2;

// A3 landscape in inches
export const A3_W_IN = 16.5354;
export const A3_H_IN = 11.6929;

export type DataRow = Record<string, unknown>;

export type HtmlOptions = {
  title: string;
  // text of the labels the VB code sets by name (heading, Arabic captions ...)
  overrides: Record<string, string>;
  // the QR code as an inline <svg> for a text (the page and footer QR)
  qrSvg: (text: string) => string;
  // data: URI of the header logo, "" when there is none
  logoDataUri: string;
};

const u = (x: number): string => `${((x * 0.01 * K).toFixed(4))}in`;
const pt = (x: number): string => `${(x * K).toFixed(3)}pt`;

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ---------- values ---------- */

// fields the designer asks for under another name than the procedure returns
const ALIASES: Record<string, string[]> = {
  faccountname: ["fcsaccountname"],
  faccountname_a: ["fcsaccountname"],
};

const rawOf = (row: DataRow | undefined, field: string): unknown => {
  if (!row) return undefined;
  if (row[field] !== undefined && row[field] !== null) return row[field];
  for (const alt of ALIASES[field] ?? []) {
    if (row[alt] !== undefined && row[alt] !== null) return row[alt];
  }
  return undefined;
};

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// the VB format strings in these reports: "{0:#,#0}", "{0:#,#0.00}" and "{0:}"
const formatValue = (v: unknown, fmt: string | null | undefined): string => {
  if (v === null || v === undefined) return "";
  if (!fmt) return String(v);

  const m = /^\{0:(.*)\}$/.exec(fmt);
  const spec = m ? m[1] : "";
  const n = toNumber(v);

  if (n === null) return String(v);
  if (spec === "#,#0") {
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (spec === "#,#0.00") {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
};

type Ctx = {
  first: DataRow | undefined;
  last: DataRow | undefined;
  rows: DataRow[];
  opt: HtmlOptions;
  // detail line number counter (VB numSlNo)
  slNo: number;
};

const sumOf = (rows: DataRow[], field: string): number => {
  // in cents, so 0.1 + 0.2 style drift never shows
  const cents = rows.reduce((s, r) => s + Math.round((toNumber(rawOf(r, field)) ?? 0) * 100), 0);
  return cents / 100;
};

/* ---------- styles ---------- */

const fontCss = (f: Font | null | undefined): string => {
  if (!f) return "";
  return `font-family:'${f.n}','Segoe UI','Noto Sans','Noto Sans Arabic','DejaVu Sans',Arial,sans-serif;font-size:${pt(f.s)};${
    f.b ? "font-weight:700;" : ""
  }${f.i ? "font-style:italic;" : ""}`;
};

const borderCss = (br: string | undefined, color: string): string => {
  const w = `${(K * 1).toFixed(2)}px solid ${color}`;
  const side = (c: string, name: string) => `border-${name}:${br?.includes(c) ? w : "0"};`;
  return side("L", "left") + side("R", "right") + side("T", "top") + side("B", "bottom");
};

const VA: Record<string, string> = { top: "top", middle: "middle", bottom: "bottom" };

/* ---------- one cell / box ---------- */

const textOf = (c: Cell | BoxItem, ctx: Ctx, band: "page" | "header" | "detail" | "footer"): string => {
  const ov = ctx.opt.overrides[c.n];
  if (ov !== undefined) return ov;

  if (c.counter) return String(ctx.slNo);

  if (c.bind) {
    if (c.sum) {
      // a summary with no format prints the number as it is (the amounts are 2-decimal numerics)
      const total = sumOf(ctx.rows, c.bind.f);
      return c.bind.fmt && c.bind.fmt !== "{0:}" ? formatValue(total, c.bind.fmt) : total.toFixed(2);
    }
    // group footer prints the last line of the group, everything else the first
    const row = band === "footer" ? ctx.last : ctx.first;
    return formatValue(rawOf(row, c.bind.f), c.bind.fmt);
  }

  // the designer's default text (the control's own name) is not real text
  if (c.text === undefined || c.text === c.n) return "";
  return c.text;
};

const qrOf = (c: BoxItem, ctx: Ctx, band: "page" | "header" | "detail" | "footer"): string => {
  const row = band === "footer" ? ctx.last : ctx.first;
  const text = c.bind ? String(rawOf(row, c.bind.f) ?? "") : "";
  if (!text) return "";
  return ctx.opt.qrSvg(text);
};

const boxItem = (c: BoxItem, ctx: Ctx, band: "page" | "header" | "detail" | "footer"): string => {
  const pos = `left:${u(c.x)};top:${u(c.y)};width:${u(c.w)};height:${u(c.h)};`;

  if (c.t === "qr") {
    return `<div class="abs qr" style="${pos}">${qrOf(c, ctx, band)}</div>`;
  }

  if (c.t === "picture") {
    const img = ctx.opt.logoDataUri ? `<img src="${ctx.opt.logoDataUri}" alt="" />` : "";
    return `<div class="abs pic" style="${pos}${borderCss(c.br, "#000")}">${img}</div>`;
  }

  const p = c.pad ?? [0, 0, 0, 0];
  const style =
    pos +
    fontCss(c.font) +
    `text-align:${c.ha};` +
    `padding:${u(p[2])} ${u(p[1])} ${u(p[3])} ${u(p[0])};` +
    `display:flex;align-items:${c.va === "top" ? "flex-start" : c.va === "bottom" ? "flex-end" : "center"};` +
    `justify-content:${c.ha === "right" ? "flex-end" : c.ha === "center" ? "center" : "flex-start"};` +
    (c.fc ? `color:${c.fc};` : "") +
    (c.bg ? `background:${c.bg};` : "") +
    borderCss(c.br, "#000");

  return `<div class="abs lbl" dir="auto" style="${style}">${esc(textOf(c, ctx, band))}</div>`;
};

// Captions keep their spaces (the designer pads them with spaces to push the Arabic and the
// English words apart) and do not wrap unless they hold a line break or are long; data wraps.
const whiteSpaceCss = (c: Cell): string => {
  if (c.nowrap) return "white-space:nowrap;overflow:hidden;";
  const t = c.text;
  if (t !== undefined && t !== c.n && !c.bind && !c.counter) {
    return t.includes("\n") || t.length > 30 || /\s{4,}/.test(t)
      ? "white-space:pre-wrap;"
      : "white-space:pre;";
  }
  return "";
};

const cellHtml = (
  c: Cell,
  rowH: number,
  rowFont: Font | null | undefined,
  tableColor: string,
  ctx: Ctx,
  band: "page" | "header" | "detail" | "footer",
  colSpan: number,
): string => {
  const p = c.pad ?? [0, 0, 0, 0];
  const style =
    `width:${u(c.w)};height:${u(rowH)};` +
    fontCss(c.font ?? rowFont) +
    `text-align:${c.ha};vertical-align:${VA[c.va]};` +
    `padding:${u(p[2])} ${u(p[1])} ${u(p[3])} ${u(p[0])};` +
    (c.fc ? `color:${c.fc};` : "") +
    (c.bg && c.bg !== "transparent" ? `background:${c.bg};` : "") +
    borderCss(c.br, c.bc ?? tableColor) +
    whiteSpaceCss(c);

  const kids = (c.kids ?? [])
    .map((k) => (k.t === "table" ? "" : boxItem(k as BoxItem, ctx, band)))
    .join("");

  const text = c.kids?.length ? "" : esc(textOf(c, ctx, band));
  return `<td dir="auto" colspan="${colSpan}" style="${style}">${text}${kids}</td>`;
};

// The rows of one XRTable can have different cell counts (the DevExpress table lets every row
// have its own column widths), so the HTML grid uses every cell edge of every row as a column
// line and each cell spans the columns between its edges.
const gridOf = (t: TableItem): { widths: number[]; spans: number[][] } => {
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const edges = new Set<number>([0]);
  const rowEdges = t.rows.map((r) => {
    let acc = 0;
    return r.cells.map((c) => {
      const from = r2(acc);
      acc += c.w;
      edges.add(r2(acc));
      return [from, r2(acc)] as [number, number];
    });
  });
  const sorted = [...edges].sort((a, b) => a - b);
  const widths = sorted.slice(1).map((e, i) => e - sorted[i]);
  const spans = rowEdges.map((cells) =>
    cells.map(([from, to]) => sorted.filter((e) => e > from && e <= to).length),
  );
  return { widths, spans };
};

const tableHtml = (
  t: TableItem,
  ctx: Ctx,
  band: "page" | "header" | "detail" | "footer",
  absolute = true,
): string => {
  const color = t.bc ?? "#000";
  const { widths, spans } = gridOf(t);
  const rows = t.rows
    .map(
      (r, ri) =>
        `<tr style="height:${u(r.h)}">${r.cells
          .map((c, ci) => cellHtml(c, r.h, r.font, color, ctx, band, Math.max(1, spans[ri][ci])))
          .join("")}</tr>`,
    )
    .join("");
  const bg = t.bg && t.bg !== "transparent" ? `background:${t.bg};` : "";
  const pos = absolute ? `position:absolute;left:${u(t.x)};top:${u(t.y)};` : "";
  return `<table class="t" style="${pos}width:${u(t.w)};${bg}"><colgroup>${widths
    .map((w) => `<col style="width:${u(w)}" />`)
    .join("")}</colgroup><tbody>${rows}</tbody></table>`;
};

const itemHtml = (
  it: Item,
  ctx: Ctx,
  band: "page" | "header" | "detail" | "footer",
  skip: Set<string>,
): string => {
  if (skip.has(it.n)) return "";
  return it.t === "table" ? tableHtml(it, ctx, band) : boxItem(it as BoxItem, ctx, band);
};

const bandHtml = (
  b: Band,
  width: number,
  ctx: Ctx,
  kind: "page" | "header" | "detail" | "footer",
  skip: Set<string> = new Set(),
): string =>
  `<div class="band" style="width:${u(width)};height:${u(b.h)}">${b.items
    .map((i) => itemHtml(i, ctx, kind, skip))
    .join("")}</div>`;

/* ---------- the document ---------- */

// the page-number label is drawn on the finished PDF (it needs the page count)
export const PAGE_LABEL = "lblGroupPageNumber";

export const buildDocumentHtml = (
  layout: Layout,
  rows: DataRow[],
  opt: HtmlOptions,
): string => {
  const { page } = layout;
  const width = page.w - page.ml - page.mr;
  const ctx: Ctx = { first: rows[0], last: rows[rows.length - 1], rows, opt, slNo: 1 };
  const skip = new Set([PAGE_LABEL]);

  // detail band: one row per line; the line no. counts the lines that carry an item
  const detailRows = rows
    .map((r) => {
      const hasItem = String(rawOf(r, "fitemid") ?? "").trim() !== "";
      const rowCtx: Ctx = { ...ctx, first: r, last: r, rows: [r] };
      if (hasItem) {
        rowCtx.slNo = ctx.slNo;
        ctx.slNo += 1;
      }
      const inner = layout.detail.items
        .map((it) => (it.t === "table" ? tableHtml(it, rowCtx, "detail", false) : ""))
        .join("");
      return `<tr class="keep"><td>${inner}</td></tr>`;
    })
    .join("\n");

  const headerBand = bandHtml(layout.pageHeader, width, ctx, "page", skip);
  const groupHeader = bandHtml(layout.groupHeader, width, ctx, "header");
  const groupFooter = bandHtml(layout.groupFooter, width, ctx, "footer");

  const m = (x: number) => `${(x * 0.01 * K).toFixed(4)}in`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(opt.title)}</title>
<style>
  @page { size: ${A3_W_IN}in ${A3_H_IN}in; margin: ${m(page.mt)} ${m(page.mr)} ${m(page.mb)} ${m(page.ml)}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact;
         font-family: 'Segoe UI','Noto Sans','Noto Sans Arabic','DejaVu Sans',Arial,sans-serif; }
  table.doc { border-collapse: collapse; width: ${u(width)}; table-layout: fixed; }
  table.doc > thead { display: table-header-group; }
  table.doc > tbody > tr > td, table.doc > thead > tr > td { padding: 0; border: 0; }
  tr.keep { break-inside: avoid; page-break-inside: avoid; }
  .band { position: relative; }
  .abs { position: absolute; }
  .lbl { overflow: hidden; line-height: 1.15; }
  .pic img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .qr svg { width: 100%; height: 100%; display: block; }
  table.t { border-collapse: collapse; table-layout: fixed; }
  table.t td { overflow: hidden; line-height: 1.15; word-wrap: break-word; overflow-wrap: anywhere; position: relative; }
  .foot { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
<table class="doc">
  <thead><tr><td>${headerBand}</td></tr></thead>
  <tbody>
    <tr class="keep"><td>${groupHeader}</td></tr>
    ${detailRows}
    <tr class="keep"><td class="foot">${groupFooter}</td></tr>
  </tbody>
</table>
</body>
</html>`;
};

/* where the "Page x of y" label sits on the page (A3 points), for the PDF step */
export const pageLabelBox = (layout: Layout) => {
  const find = (items: Item[]): BoxItem | undefined =>
    items.find((i) => i.n === PAGE_LABEL) as BoxItem | undefined;
  const lbl = find(layout.pageHeader.items);
  if (!lbl) return null;
  const f = (x: number) => x * 0.01 * K * 72; // report units -> A3 points
  return {
    x: f(layout.page.ml + lbl.x + (lbl.pad?.[0] ?? 0)),
    // top of the label box, measured from the top of the page
    top: f(layout.page.mt + lbl.y),
    h: f(lbl.h),
    size: (lbl.font?.s ?? 9) * K,
  };
};
