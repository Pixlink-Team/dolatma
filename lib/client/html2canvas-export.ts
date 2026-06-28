/**
 * html2canvas cannot parse modern CSS color functions (oklch/oklab) used by Tailwind v4.
 * Sanitize stylesheets on the clone and inline computed styles as a fallback.
 */
const UNSUPPORTED_COLOR_PATTERN = /\b(?:oklch|oklab|color-mix)\([^)]*\)/gi;

function sanitizeCssText(css: string): string {
  return css.replace(UNSUPPORTED_COLOR_PATTERN, "rgb(128, 128, 128)");
}

function inlineComputedStyles(source: Element, target: HTMLElement) {
  const computed = window.getComputedStyle(source);
  for (let i = 0; i < computed.length; i += 1) {
    const prop = computed.item(i);
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    target.style.setProperty(prop, sanitizeCssText(value), computed.getPropertyPriority(prop));
  }
}

export function buildHtml2CanvasOnClone(originalRoot: HTMLElement) {
  return (clonedDoc: Document, clonedRoot: HTMLElement) => {
    clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
      node.remove();
    });

    clonedDoc.querySelectorAll("style").forEach((node) => {
      if (node.textContent) {
        node.textContent = sanitizeCssText(node.textContent);
      }
    });

    clonedDoc.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
      const inlineStyle = node.getAttribute("style");
      if (inlineStyle) {
        node.setAttribute("style", sanitizeCssText(inlineStyle));
      }
    });

    const originalNodes = [originalRoot, ...Array.from(originalRoot.querySelectorAll<HTMLElement>("*"))];
    const clonedNodes = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*"))];
    const count = Math.min(originalNodes.length, clonedNodes.length);

    for (let i = 0; i < count; i += 1) {
      inlineComputedStyles(originalNodes[i], clonedNodes[i]);
    }
  };
}

export function shouldIgnoreHtml2CanvasElement(element: Element): boolean {
  const tag = element.tagName;
  if (tag === "IFRAME" || tag === "VIDEO") return true;
  if (element.closest("[data-export-overlay]")) return true;
  return false;
}
