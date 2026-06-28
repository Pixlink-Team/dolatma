/**
 * html2canvas cannot parse modern CSS color functions (oklch/oklab) used by Tailwind v4.
 * Inline computed styles on the clone so only browser-resolved rgb/hsl values are used.
 */
function inlineComputedStyles(source: Element, target: HTMLElement) {
  const computed = window.getComputedStyle(source);
  for (let i = 0; i < computed.length; i += 1) {
    const prop = computed.item(i);
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    target.style.setProperty(prop, value, computed.getPropertyPriority(prop));
  }
}

export function buildHtml2CanvasOnClone(originalRoot: HTMLElement) {
  return (_clonedDoc: Document, clonedRoot: HTMLElement) => {
    _clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      node.remove();
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
  return tag === "IFRAME" || tag === "VIDEO" || tag === "CANVAS";
}
