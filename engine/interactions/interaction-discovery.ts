import type { Page } from "playwright";
import type { PageInteraction } from "../models/page-capture.ts";

const INTERACTIVE_SELECTOR = [
  "a[href]", "button", "input", "select", "textarea", "[role='button']", "[role='link']",
  "[role='tab']", "[role='checkbox']", "[role='radio']", "[role='switch']", "[role='menuitem']",
  "[role='option']", "[role='combobox']", "[aria-controls]",
].join(",");

const BLOCKED_ACTION_PATTERN = /\b(delete|destroy|purchase|buy now|checkout|submit payment|make payment|place order|unsubscribe|cancel subscription|sign out|log out|logout)\b/i;

function classify(i: Omit<PageInteraction, "normalizedBounds" | "executionSafety" | "executionReason">): Pick<PageInteraction, "executionSafety" | "executionReason"> {
  if (i.disabled) return { executionSafety: "blocked", executionReason: "The control is disabled." };
  const description = `${i.accessibleName} ${i.visibleText}`.trim();
  if (BLOCKED_ACTION_PATTERN.test(description)) return { executionSafety: "blocked", executionReason: "The control appears destructive, transactional, or session-ending." };
  if (i.elementType === "input" && i.inputType === "file") return { executionSafety: "blocked", executionReason: "File selection requires external data and is not executed automatically." };
  const isFormAction = Boolean(i.formAction) && ((i.elementType === "button" && (i.inputType === "submit" || i.inputType === "reset")) || (i.elementType === "input" && ["submit", "image", "reset"].includes(i.inputType ?? "")));
  if (isFormAction) return { executionSafety: "review", executionReason: "This appears to submit or reset a form. Review it before allowing execution." };
  if (i.href) {
    try {
      const protocol = new URL(i.href).protocol;
      if (!["http:", "https:"].includes(protocol)) return { executionSafety: "review", executionReason: `Navigation uses ${protocol}; review before execution.` };
    } catch {
      return { executionSafety: "review", executionReason: "The navigation target could not be validated; review before execution." };
    }
  }
  return { executionSafety: "safe", executionReason: "No known side effect was detected." };
}

export async function discoverInteractions(page: Page, documentSize: { width: number; height: number }): Promise<PageInteraction[]> {
  const observed = await page.locator(INTERACTIVE_SELECTOR).evaluateAll((elements) => {
    function selectorFor(element: Element) {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && parts.length < 5) {
        let part = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (parent) {
          const same = Array.from(parent.children).filter((candidate) => candidate.tagName === current?.tagName);
          if (same.length > 1) part += `:nth-of-type(${same.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(" > ");
    }

    function visibleTextFor(element: Element) {
      if (element instanceof HTMLInputElement) return element.value || element.placeholder || "";
      return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    }

    function nameFor(element: Element, visibleText: string) {
      const aria = element.getAttribute("aria-label")?.trim();
      if (aria) return aria;
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const label = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? "").filter(Boolean).join(" ");
        if (label) return label;
      }
      if (element instanceof HTMLInputElement && element.labels?.length) {
        const label = Array.from(element.labels).map((item) => item.textContent?.trim() ?? "").filter(Boolean).join(" ");
        if (label) return label;
      }
      return element.getAttribute("title")?.trim() || visibleText;
    }

    function stackingOrderFor(element: Element, index: number) {
      let score = 0;
      let depth = 0;
      let current: Element | null = element;
      while (current) {
        const style = getComputedStyle(current);
        const zIndex = Number.parseInt(style.zIndex, 10);
        if (Number.isFinite(zIndex)) score += zIndex * 1_000_000;
        if (style.position === "fixed") score += 500_000;
        else if (style.position === "sticky") score += 250_000;
        depth += 1;
        current = current.parentElement;
      }
      return score + depth * 1000 + index;
    }

    function browserHitRegions(element: Element, rect: DOMRect) {
      const visibleLeft = Math.max(0, rect.left);
      const visibleTop = Math.max(0, rect.top);
      const visibleRight = Math.min(innerWidth, rect.right);
      const visibleBottom = Math.min(innerHeight, rect.bottom);
      if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return { sampled: false, regions: [] as Array<{ x: number; y: number; width: number; height: number }> };

      const columns = Math.max(1, Math.min(5, Math.ceil((visibleRight - visibleLeft) / 36)));
      const rows = Math.max(1, Math.min(5, Math.ceil((visibleBottom - visibleTop) / 36)));
      const cellWidth = (visibleRight - visibleLeft) / columns;
      const cellHeight = (visibleBottom - visibleTop) / rows;
      const regions: Array<{ x: number; y: number; width: number; height: number }> = [];

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const left = visibleLeft + column * cellWidth;
          const top = visibleTop + row * cellHeight;
          const x = left + cellWidth / 2;
          const y = top + cellHeight / 2;
          const topElement = document.elementFromPoint(x, y);
          const reachable = Boolean(topElement && (topElement === element || element.contains(topElement)));
          if (reachable) regions.push({ x: left + scrollX, y: top + scrollY, width: cellWidth, height: cellHeight });
        }
      }
      return { sampled: true, regions };
    }

    return elements.flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!(rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0)) return [];
      const visibleText = visibleTextFor(element);
      const htmlElement = element as HTMLElement;
      const href = element instanceof HTMLAnchorElement ? element.href : null;
      const disabled = (("disabled" in htmlElement) && Boolean((htmlElement as HTMLButtonElement).disabled)) || element.getAttribute("aria-disabled") === "true";
      const form = htmlElement.closest("form");
      const inputType = element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.type || null : null;
      const hitTest = browserHitRegions(element, rect);
      return [{
        id: `interaction-${index + 1}`,
        elementType: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        accessibleName: nameFor(element, visibleText),
        visibleText,
        href,
        disabled,
        formAction: form instanceof HTMLFormElement ? form.action || null : null,
        formMethod: form instanceof HTMLFormElement ? form.method || null : null,
        inputType,
        locator: { tagName: element.tagName.toLowerCase(), id: element.id || null, name: element.getAttribute("name"), testId: element.getAttribute("data-testid"), selector: selectorFor(element) },
        bounds: { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height },
        stackingOrder: stackingOrderFor(element, index),
        hitTestRegions: hitTest.regions,
        hitTestSampled: hitTest.sampled,
      }];
    });
  });

  return observed.map((interaction) => ({
    ...interaction,
    ...classify(interaction),
    normalizedBounds: {
      xRatio: interaction.bounds.x / documentSize.width,
      yRatio: interaction.bounds.y / documentSize.height,
      widthRatio: interaction.bounds.width / documentSize.width,
      heightRatio: interaction.bounds.height / documentSize.height,
    },
  }));
}
