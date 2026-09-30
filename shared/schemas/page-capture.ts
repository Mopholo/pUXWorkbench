import { z } from "zod";

export const pageCaptureSchema = z.object({
  requestedUrl: z.string().url(), finalUrl: z.string().url(), title: z.string(), capturedAt: z.string(),
  viewport: z.object({ width: z.number().positive(), height: z.number().positive() }),
  document: z.object({ width: z.number().nonnegative(), height: z.number().nonnegative() }),
  screenshot: z.object({ mediaType: z.literal("image/png"), dataUrl: z.string().startsWith("data:image/png;base64,") }),
});
export type PageCapture = z.infer<typeof pageCaptureSchema>;
