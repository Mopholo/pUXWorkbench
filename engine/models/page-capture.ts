export interface PageCapture {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  document: { width: number; height: number };
  screenshot: { mediaType: "image/png"; dataUrl: string };
}
