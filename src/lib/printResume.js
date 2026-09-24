// Prints the generated resume as exactly one A4 page.
//
// Why a separate print document: measuring the on-screen sheet can't work —
// the phone layout is narrow and screen styles differ from print styles, so
// any scale computed on-screen is wrong (previously printed tiny). Ancestors
// of the sheet can also leak extra blank pages. Instead we render ONLY the
// sheet in an isolated document styled by resume-print.css, measure at the
// true print width (703px), shrink-to-fit if needed.
//
// Why a new tab instead of a hidden iframe: iframe.contentWindow.print()
// silently does nothing in many mobile browsers and in-app WebViews
// (e.g. WPS Office). Opening the print document in a new tab and printing
// the top-level window from a real tap reliably opens the print dialog,
// where "Save as PDF" lives on mobile.

import printCss from "./resume-print.css?raw";

const PRINT_W_PX = 703; // A4 @96dpi minus 12mm side margins
const PRINT_H_PX = 1020; // A4 @96dpi minus 11mm top/bottom margins, safety margin

function sheetClone() {
  const sheet = document.getElementById("resume-sheet");
  if (!sheet) return null;
  const clone = sheet.cloneNode(true);
  clone.removeAttribute("contenteditable");
  clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
  return clone;
}

// Render the sheet at the true print width inside a hidden iframe, fit it to
// one page, and resolve with the fitted sheet HTML (zoom baked in as inline
// styles so the receiving document needs no measuring of its own).
function fittedSheetHtml() {
  return new Promise((resolve) => {
    const src = sheetClone();
    if (!src) return resolve(null);
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;top:0;left:0;width:" +
      PRINT_W_PX +
      "px;height:0;border:0;visibility:hidden;pointer-events:none;";
    frame.srcdoc =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
      printCss +
      "</style></head><body>" +
      src.outerHTML +
      "</body></html>";
    const done = (html) => {
      frame.remove();
      resolve(html);
    };
    frame.onload = () => {
      try {
        const s = frame.contentDocument.getElementById("resume-sheet");
        if (!s) return done(null);
        // Shrink (or slightly grow, capped) to fill exactly one page.
        let z = PRINT_H_PX / s.scrollHeight;
        z = Math.min(1.18, z);
        if (z !== 1) {
          s.style.zoom = z;
          s.style.setProperty("width", 100 / z + "%", "important");
        }
        // Narrower layout wraps more lines, so re-check the rendered height
        // and never let it spill past one page.
        const rendered = s.getBoundingClientRect().height;
        if (rendered > PRINT_H_PX) {
          const z2 = z * (PRINT_H_PX / rendered);
          s.style.zoom = z2;
          s.style.setProperty("width", 100 / z2 + "%", "important");
        }
        done(s.outerHTML);
      } catch {
        done(null);
      }
    };
    // Safety: never hang if the iframe fails to load.
    setTimeout(() => {
      if (frame.isConnected) done(null);
    }, 5000);
    document.body.appendChild(frame);
  });
}

function buildPrintDoc(fittedSheet) {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>Resume</title><style>" +
    printCss +
    "</style><style>" +
    // On screen, constrain to the true print width and center; in print the
    // @page margins already give the 703px content box.
    "@media screen{body{width:" +
    PRINT_W_PX +
    "px!important;max-width:100%!important;margin:0 auto!important;}}" +
    ".print-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;" +
    "justify-content:center;padding:12px 16px;background:#161616;color:#fff;" +
    "font-family:Arial,Helvetica,sans-serif;}" +
    ".print-toolbar button{background:#fff;color:#161616;border:0;padding:10px 20px;" +
    "font-size:14px;font-weight:700;cursor:pointer;}" +
    ".print-toolbar span{font-size:12px;opacity:.7;}" +
    "@media print{.print-toolbar{display:none!important;}}" +
    "</style></head><body>" +
    '<div class="print-toolbar"><button onclick="window.print()">' +
    "Print / Save as PDF</button>" +
    "<span>Choose &ldquo;Save as PDF&rdquo; in the print dialog</span></div>" +
    fittedSheet +
    "<script>setTimeout(function(){window.print();},450);</script>" +
    "</body></html>"
  );
}

// Old hidden-iframe print, kept as a fallback for when the new tab is blocked.
function printViaIframe(fittedSheet) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;top:0;left:0;width:" +
    PRINT_W_PX +
    "px;height:0;border:0;visibility:hidden;pointer-events:none;";
  frame.srcdoc =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    printCss +
    "</style></head><body>" +
    fittedSheet +
    "</body></html>";
  const cleanup = () => frame.remove();
  frame.onload = () => {
    try {
      const win = frame.contentWindow;
      win.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 15000);
      win.focus();
      win.print();
    } catch {
      cleanup();
      window.print();
    }
  };
  document.body.appendChild(frame);
}

export async function printResume() {
  // Open the tab synchronously inside the tap gesture so popup blockers
  // allow it; the fitted document is navigated in once measured.
  const tab = window.open("about:blank", "_blank");
  const fitted = await fittedSheetHtml();
  if (!fitted) {
    if (tab) tab.close();
    window.print();
    return;
  }
  const url = URL.createObjectURL(new Blob([buildPrintDoc(fitted)], { type: "text/html" }));
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (tab) {
    tab.location.href = url;
  } else {
    printViaIframe(fitted);
  }
}

// Download the same one-page print document as a standalone .html file —
// an escape hatch for browsers where window.print() is a no-op (some
// in-app WebViews): the file can be opened in Chrome/WPS Office and
// printed or shared from there.
export async function downloadResumeHtml() {
  const fitted = await fittedSheetHtml();
  if (!fitted) return;
  const blob = new Blob([buildPrintDoc(fitted)], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ats-friendly-resume.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
