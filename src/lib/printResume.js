// Prints the generated resume as exactly one A4 page.
//
// Why an iframe: measuring the on-screen sheet can't work — the phone layout
// is narrow and screen styles differ from print styles, so any scale computed
// on-screen is wrong (previously printed tiny). Ancestors of the sheet can
// also leak extra blank pages. Instead we render ONLY the sheet in an
// isolated document styled by resume-print.css (always on there), measure at
// the true print width, shrink-to-fit if needed, then print that document.

import printCss from "./resume-print.css?raw";

const PRINT_W_PX = 703; // A4 @96dpi minus 12mm side margins
const PRINT_H_PX = 1020; // A4 @96dpi minus 11mm top/bottom margins, safety margin

export function printResume() {
  const sheet = document.getElementById("resume-sheet");
  if (!sheet) {
    window.print();
    return;
  }

  const docHtml =
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" +
    printCss +
    "</style></head><body>" +
    sheet.outerHTML +
    "</body></html>";

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;top:0;left:0;width:" +
    PRINT_W_PX +
    "px;height:0;border:0;visibility:hidden;pointer-events:none;";
  frame.srcdoc = docHtml;

  const cleanup = () => frame.remove();

  frame.onload = () => {
    try {
      const doc = frame.contentDocument;
      const s = doc.getElementById("resume-sheet");
      if (!s) {
        cleanup();
        window.print();
        return;
      }
      s.removeAttribute("contenteditable");
      // Measure with the final print styles at the true print width, then
      // scale down only as much as needed to fit one page.
      const z = Math.min(1, PRINT_H_PX / s.scrollHeight);
      if (z < 1) {
        s.style.zoom = z;
        s.style.width = 100 / z + "%";
      }
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
