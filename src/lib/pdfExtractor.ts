// ─── Client-side PDF text extraction using pdfjs-dist ────────────────────────
// Sets up the worker via import.meta.url (Vite-native, no extra config needed)

import * as pdfjs from 'pdfjs-dist';

// Point the PDF.js worker to the local copy bundled by Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

// Threshold in PDF points within which text items are considered the same line
const LINE_Y_TOLERANCE = 3;

/**
 * Extracts all text from a PDF File as an ordered array of lines.
 * Items are grouped by their Y coordinate (top-to-bottom) and sorted
 * left-to-right within each line — preserving the reading order.
 */
export async function extractPDFLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Map: rounded-Y → [{x, str}]
    const lineMap = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const rawY = item.transform[5] as number;
      const rawX = item.transform[4] as number;

      // Find or create a bucket whose key is within tolerance of rawY
      let bucketY: number | null = null;
      for (const key of lineMap.keys()) {
        if (Math.abs(key - rawY) <= LINE_Y_TOLERANCE) {
          bucketY = key;
          break;
        }
      }
      if (bucketY === null) {
        bucketY = rawY;
        lineMap.set(bucketY, []);
      }
      lineMap.get(bucketY)!.push({ x: rawX, str: item.str });
    }

    // Sort lines top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const lineText = items.map((i) => i.str).join(' ').trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return allLines;
}
