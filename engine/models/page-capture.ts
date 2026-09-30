export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedElementBounds {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

export interface InteractionLocator {
  tagName: string;
  id: string | null;
  name: string | null;
  testId: string | null;
  selector: string;
}

export interface PageInteraction {
  id: string;
  elementType: string;
  role: string | null;
  accessibleName: string;
  visibleText: string;
  href: string | null;
  disabled: boolean;
  locator: InteractionLocator;
  bounds: ElementBounds;
  normalizedBounds: NormalizedElementBounds;
}

export interface PageCapture {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  document: { width: number; height: number };
  interactions: PageInteraction[];
  screenshot: { mediaType: "image/png"; dataUrl: string };
}
