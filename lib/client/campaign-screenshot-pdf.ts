import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { buildHtml2CanvasOnClone, shouldIgnoreHtml2CanvasElement } from "@/lib/client/html2canvas-export";

const PAGE_MARGIN_MM = 8;
const CAPTURE_SCALE = 1.5;
const MAX_CANVAS_HEIGHT_PX = 14000;

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

async function waitForExportReady(root: HTMLElement) {
  await waitForImages(root);
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstPage: boolean) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const contentHeight = pageHeight - PAGE_MARGIN_MM * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  if (imgHeight <= contentHeight) {
    if (!isFirstPage) pdf.addPage();
    pdf.addImage(imgData, "JPEG", PAGE_MARGIN_MM, PAGE_MARGIN_MM, imgWidth, imgHeight);
    return;
  }

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < imgHeight) {
    if (!isFirstPage || pageIndex > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "JPEG",
      PAGE_MARGIN_MM,
      PAGE_MARGIN_MM - offsetY,
      imgWidth,
      imgHeight
    );
    offsetY += contentHeight;
    pageIndex += 1;
  }
}

async function captureElementCanvas(root: HTMLElement): Promise<HTMLCanvasElement> {
  const width = root.scrollWidth;
  const height = root.scrollHeight;
  const scale = Math.min(CAPTURE_SCALE, MAX_CANVAS_HEIGHT_PX / Math.max(height, 1));

  return html2canvas(root, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    onclone: buildHtml2CanvasOnClone(root),
    ignoreElements: shouldIgnoreHtml2CanvasElement,
  });
}

export async function exportCampaignScreenshotPdf(options: {
  rootSelector?: string;
  filename: string;
  onProgress?: (message: string) => void;
}) {
  const root = document.querySelector(options.rootSelector ?? "[data-campaign-export-root]") as HTMLElement | null;
  if (!root) {
    throw new Error("Campaign export root not found");
  }

  const overlay = document.querySelector("[data-export-overlay]") as HTMLElement | null;

  window.scrollTo(0, 0);
  document.documentElement.setAttribute("data-campaign-export", "true");
  if (overlay) overlay.style.visibility = "hidden";

  options.onProgress?.("در حال آماده‌سازی صفحه...");
  await waitForExportReady(root);

  try {
    options.onProgress?.("در حال ثبت اسکرین‌شات کامل صفحه...");
    const canvas = await captureElementCanvas(root);

    options.onProgress?.("در حال ساخت PDF...");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    addCanvasToPdf(pdf, canvas, true);
    pdf.save(options.filename);
  } finally {
    document.documentElement.removeAttribute("data-campaign-export");
    if (overlay) overlay.style.visibility = "";
  }
}
