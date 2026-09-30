import type { Page } from "playwright";
import type { PageInteraction } from "../models/page-capture.ts";

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='menuitem']",
  "[role='option']",
  "[role='combobox']",
].join(",");

const BLOCKED_ACTION_PATTERN = /\b(delete|remove|destroy|purchase|buy|checkout|pay|payment|place order|submit order|sign out|log out|logout|unsubscribe|cancel subscription)\b/i;

function classifyExecutionSafety(interaction: Omit<PageInteraction, "normalizedBounds" | "executionSafety" | "executionReason">): Pick<PageInteraction, "executionSafety" | "executionReason"> {
  if (interaction.disabled) {
    return { executionSafety: "blocked", executionReason: "The control is disabled." };
  }

  const description = `${interaction.accessibleName} ${interaction.visibleText}`.trim();
  if (BLOCKED_ACTION_PATTERN.test(description)) {
    return { executionSafety: "blocked", executionReason: "The control appears destructive or transactional." };
  }

  if (interaction.elementType === "input" || interaction.elementType === "select" || interaction.elementType === "textarea") {
    return { executionSafety: "blocked", executionReason: "Milestone 3 does not enter or submit form data." };
  }

  if (interaction.elementType === "button" && interaction.formAction && interaction.inputType === "submit") {
    return { executionSafety: "blocked", executionReason: "Form submission is blocked during Milestone 3." };
  }

  if (interaction.formAction && interaction.elementType === "button") {
    return { executionSafety: "blocked", executionReason: "Buttons associated with a form are blocked during Milestone 3." };
  }

  if (interaction.href) {
    try {
      const protocol = new URL(interaction.href).protocol;
      if (protocol !== "http:" && protocol !== "https:") {
        return { executionSafety: "blocked", executionReason: `Navigation using ${protocol} is not executed.` };
      }
    } catch {
      return { executionSafety: "blocked", executionReason: "The navigation target could not be validated." };
    }
  }

  return { executionSafety: "allowed", executionReason: "Eligible for explicit Milestone 3 execution." };
}

export async function discoverInteractions(
  page: Page,
  documentSize: { width: number; height: number },
): Promise<PageInteraction[]> {
  const observed = await page.locator(INTERACTIVE_SELECTOR).evaluateAll((elements) => {
    function selectorFor(element: Element): string {
      if (element.id) return `#${CSS.escape(element.id)}`;

      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${CSS.escape(testId)}"]`;

      const parts: string[] = [];
      let current: Element | null = element;
      while (current && parts.length < 5) {
        let part = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter(
            (child) => child.tagName === current?.tagName,
          );
          if (sameTag.length > 1) {
            part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
          }
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(" > ");
    }

    function visibleTextFor(element: Element): string {
      if (element instanceof HTMLInputElement) {
        return element.value || element.placeholder || "";
      }
      return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    }

    function accessibleNameFor(element: Element, visibleText: string): string {
      const ariaLabel = element.getAttribute("aria-label")?.trim();
      if (ariaLabel) return ariaLabel;

      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const label = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        if (label) return label;
      }

      if (element instanceof HTMLInputElement && element.labels?.length) {
        const label = Array.from(element.labels)
          .map((item) => item.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        if (label) return label;
      }

      return element.getAttribute("title")?.trim() || visibleText;
    }

    return elements.flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0;

      if (!isVisible) return [];

      const visibleText = visibleTextFor(element);
      const htmlElement = element as HTMLElement;
      const href = element instanceof HTMLAnchorElement ? element.href : null;
      const disabled =
        ("disabled" in htmlElement && Boolean((htmlElement as HTMLButtonElement).disabled)) ||
        element.getAttribute("aria-disabled") === "true";
      const form = element instanceof HTMLElement ? element.closest("form") : null;
      const inputType =
        element instanceof HTMLButtonElement || element instanceof HTMLInputElement
          ? element.type || null
          : null;

      return [{
        id: `interaction-${index + 1}`,
        elementType: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        accessibleName: accessibleNameFor(element, visibleText),
        visibleText,
        href,
        disabled,
        formAction: form instanceof HTMLFormElement ? form.action || null : null,
        formMethod: form instanceof HTMLFormElement ? form.method || null : null,
        inputType,
        locator: {
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          name: element.getAttribute("name"),
          testId: element.getAttribute("data-testid"),
          selector: selectorFor(element),
        },
        bounds: {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        },
      }];
    });
  });

  return observed.map((interaction) => ({
    ...interaction,
    ...classifyExecutionSafety(interaction),
    normalizedBounds: {
      xRatio: interaction.bounds.x / documentSize.width,
      yRatio: interaction.bounds.y / documentSize.height,
      widthRatio: interaction.bounds.width / documentSize.width,
      heightRatio: interaction.bounds.height / documentSize.height,
    },
  }));
}
