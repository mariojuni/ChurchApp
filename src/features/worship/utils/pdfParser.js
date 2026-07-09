import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Use local worker via Vite URL loader
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parseWorshipPdf = async (fileBuffer) => {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
  const pdfDocument = await loadingTask.promise;
  
  const pages = [];
  
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group text items by Y coordinate to form lines
    const lineMap = new Map();
    
    textContent.items.forEach(item => {
      // transform[4] is X, transform[5] is Y
      const x = item.transform[4];
      const y = Math.round(item.transform[5]); // Round to group near items
      
      // Look for a close Y coordinate (within 3 points) to handle slight baseline differences
      let yKey = y;
      for (const existingY of lineMap.keys()) {
        if (Math.abs(existingY - y) <= 3) {
          yKey = existingY;
          break;
        }
      }
      
      if (!lineMap.has(yKey)) {
        lineMap.set(yKey, []);
      }
      
      lineMap.get(yKey).push({
        str: item.str,
        x: x,
        y: yKey,
        width: item.width,
        height: item.height,
        fontName: item.fontName
      });
    });
    
    // Sort lines by Y descending (PDF coordinates start from bottom left)
    const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);
    
    const lines = sortedYKeys.map(y => {
      // Sort items within the line by X ascending
      const items = lineMap.get(y).sort((a, b) => a.x - b.x);
      return {
        y,
        items,
        text: items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()
      };
    });
    
    pages.push(lines);
  }
  
  // Combine all lines across pages, maintaining order
  const allLines = pages.flat();
  
  // Extract Metadata
  const metadata = extractMetadata(allLines);
  
  return {
    metadata,
    lines: allLines
  };
};

function extractMetadata(lines) {
  const metadata = {
    title: '',
    composer: '',
    originalKey: '',
    tempoBpm: '',
    timeSignature: '',
    ccliSongNumber: '',
    copyrightYear: '',
    copyrightOwner: '',
    ccliLicenseNumber: ''
  };

  const fullText = lines.map(l => l.text).join('\n');

  // Title is usually the first non-empty line on the first page with a large font
  const firstRealLine = lines.find(l => l.text.length > 2);
  if (firstRealLine) {
    metadata.title = firstRealLine.text;
    
    // Composer is usually right below the title
    const titleIndex = lines.indexOf(firstRealLine);
    if (lines.length > titleIndex + 1) {
      metadata.composer = lines[titleIndex + 1].text;
    }
  }

  // Key, Tempo, Time (e.g., Key - E | Tempo - 64 | Time - 4/4)
  const keyMatch = fullText.match(/Key\s*-\s*([A-G][#b]?m?)/i);
  if (keyMatch) metadata.originalKey = keyMatch[1];
  
  const tempoMatch = fullText.match(/Tempo\s*-\s*(\d+)/i);
  if (tempoMatch) metadata.tempoBpm = tempoMatch[1];

  const timeMatch = fullText.match(/Time\s*-\s*(\d\/\d)/i);
  if (timeMatch) metadata.timeSignature = timeMatch[1];

  // CCLI Song # 7096627
  const ccliSongMatch = fullText.match(/CCLI Song #\s*(\d+)/i) || fullText.match(/CCLI Song No\.?\s*(\d+)/i);
  if (ccliSongMatch) metadata.ccliSongNumber = ccliSongMatch[1];

  // CCLI License No
  const ccliLicenseMatch = fullText.match(/CCLI Licen[sc]e (?:No\.?|#)?\s*(\d+)/i);
  if (ccliLicenseMatch) metadata.ccliLicenseNumber = ccliLicenseMatch[1];

  // Copyright: © 2017 Sovereign Grace Worship
  const copyrightMatch = fullText.match(/©\s*(\d{4})?\s*(.*)/i);
  if (copyrightMatch) {
    if (copyrightMatch[1]) metadata.copyrightYear = copyrightMatch[1];
    if (copyrightMatch[2]) {
      metadata.copyrightOwner = copyrightMatch[2].replace(/CCLI.*/i, '').trim();
    }
  }

  return metadata;
}
