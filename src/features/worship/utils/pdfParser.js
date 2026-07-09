import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Use local worker via Vite URL loader
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parseWorshipPdf = async (fileBuffer) => {
  const loadingTask = pdfjsLib.getDocument({ 
    data: new Uint8Array(fileBuffer),
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });
  const pdfDocument = await loadingTask.promise;
  
  const pages = [];
  
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    let textContent = await page.getTextContent();
    
    const totalChars = textContent.items.reduce((acc, item) => acc + item.str.length, 0);
    
    // If the page yields < 350 characters, it's highly likely a rasterized or outlined PDF 
    // that only left the title and footer selectable. Fallback to OCR!
    if (totalChars < 350) {
      console.log(`Page ${i} appears to be outlined/rasterized (${totalChars} chars). Falling back to OCR...`);
      textContent = await performOcrOnPage(page);
    }
    
    // Group text items by Y coordinate to form lines
    const lineMap = new Map();
    
    textContent.items.forEach(item => {
      // transform[4] is X, transform[5] is Y
      const x = item.transform[4];
      const y = Math.round(item.transform[5]); // Round to group near items
      
      // Look for a close Y coordinate to handle slight baseline differences and superscripts.
      // Superscripts are typically offset by about 30-40% of the font size.
      let yKey = y;
      // Cap the tolerance at 8 points for normal PDFs.
      // For OCR, bounding boxes fluctuate significantly, so we enforce a larger minimum tolerance (10 points).
      // Since chords sit roughly 18-24 points above lyrics, a 10-point tolerance is perfectly safe and won't merge them.
      let tolerance;
      if (item.isOcr) {
        tolerance = Math.min(Math.max(10, item.height * 0.6), 18);
      } else {
        tolerance = Math.min(Math.max(3, item.height * 0.45), 8);
      }
      
      for (const existingY of lineMap.keys()) {
        if (Math.abs(existingY - y) <= tolerance) {
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
      
      let text = '';
      let lastItem = null;
      
      items.forEach(item => {
        if (!lastItem) {
          text += item.str;
        } else {
          const gap = item.x - (lastItem.x + lastItem.width);
          const isSuperscript = item.height < lastItem.height * 0.9 && item.y > lastItem.y + 1 && gap < 4;
          
          // A space is typically 20-30% of font height. 
          // We only inject a space if the gap implies a visual space.
          if (gap > Math.min(3.5, lastItem.height * 0.22) && !isSuperscript) {
            // Only add a space if neither side already has one
            if (!text.endsWith(' ') && !item.str.startsWith(' ')) {
              text += ' ';
            }
          }
          text += item.str;
        }
        lastItem = item;
      });
      
      return {
        y,
        items,
        // Strip invisible characters like zero-width spaces that break regex matching
        text: text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').replace(/\s+/g, ' ').trim()
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

async function performOcrOnPage(page) {
  const scale = 2.0; // Higher scale dramatically improves OCR accuracy
  const viewport = page.getViewport({ scale });
  
  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  // CRITICAL FIX: Fill the canvas with white before rendering the PDF.
  // PDF.js renders with a transparent background by default. 
  // Tesseract converts transparency to black, making black lyrics invisible!
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Render PDF page into canvas
  await page.render({ canvasContext: context, viewport }).promise;
  const imageData = canvas.toDataURL('image/png');
  
  // Run Tesseract
  const { data } = await Tesseract.recognize(imageData, 'eng', {
    logger: m => console.log('OCR Status:', m.status, Math.round(m.progress * 100) + '%')
  });
  
  // Map Tesseract bounding boxes back into pdf.js spatial format using precise centers
  const items = [];
  if (data && data.words) {
    data.words.forEach(w => {
      const x = w.bbox.x0 / scale;
      const width = (w.bbox.x1 - w.bbox.x0) / scale;
      const height = (w.bbox.y1 - w.bbox.y0) / scale;
      
      // CRITICAL FIX: Use the center of the bounding box! 
      // Bottom (y1) varies wildly due to descenders (p, y, g). Top (y0) varies due to capitals.
      // The center perfectly stabilizes the word within our lineMap tolerance, ensuring sentences 
      // merge horizontally while keeping superscript chords safely on their own line!
      const yCenter = (w.bbox.y0 + w.bbox.y1) / 2;
      const y = (viewport.height - yCenter) / scale; 
      
      items.push({
        str: w.text,
        transform: [1, 0, 0, 1, x, y],
        width: width,
        height: height,
        isOcr: true
      });
    });
  }
  
  return { items };
}

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

  // Find the line with the largest font size to identify the title
  let maxFontHeight = 0;
  let titleLine = null;
  
  // Only look in the first 10 lines to find the title, avoiding headers like VERSE
  const searchLines = lines.slice(0, Math.min(10, lines.length));
  
  for (const line of searchLines) {
    if (line.text.length > 2) {
      // Find max height of items in this line
      const lineMaxHeight = Math.max(...line.items.map(i => i.height || 0));
      if (lineMaxHeight > maxFontHeight) {
        maxFontHeight = lineMaxHeight;
        titleLine = line;
      }
    }
  }

  if (titleLine) {
    metadata.title = titleLine.text;
    
    // The composer might be on the next line or span multiple lines, up to the 'Key -' or chord line.
    const titleIndex = lines.indexOf(titleLine);
    let composerText = [];
    
    for (let i = titleIndex + 1; i < lines.length; i++) {
      const lineText = lines[i].text.trim();
      if (!lineText) continue;
      
      // Stop if we hit metadata line
      const isMetadata = lineText.match(/Key\s*-/i) || lineText.match(/Tempo\s*-/i) || lineText.match(/Time\s*-/i);
      
      if (isMetadata) {
        // If the line also contains composer info (e.g. "Words and Music by ... Key - D")
        const composerPart = lineText.replace(/(Key|Tempo|Time)\s*-.*$/i, '').trim();
        if (composerPart) {
          composerText.push(composerPart);
        }
        break;
      }
      
      // Stop if we hit a section header
      if (lineText.match(/^(VERSE|CHORUS|BRIDGE|INTRO|OUTRO|TAG)/i)) {
        break;
      }
      
      // If there's a big gap in Y, it might not be composer anymore, but we'll rely on regex stops for now
      composerText.push(lineText);
    }
    
    if (composerText.length > 0) {
      let combinedComposer = composerText.join(' ');
      // Strip common prefixes
      combinedComposer = combinedComposer.replace(/\[Default Arrangement\] by /i, '');
      combinedComposer = combinedComposer.replace(/\(as published by .*?\)/i, '');
      combinedComposer = combinedComposer.replace(/Words and Music by /i, '');
      combinedComposer = combinedComposer.replace(/Words & Music by /i, '');
      combinedComposer = combinedComposer.replace(/^By /i, '');
      metadata.composer = combinedComposer.trim();
    }
  }

  // Key, Tempo, Time (e.g., Key - E | Tempo - 64 | Time - 4/4)
  const keyMatch = fullText.match(/Key\s*-\s*([A-G][#b]?m?)/i);
  if (keyMatch) {
    metadata.originalKey = keyMatch[1];
  } else if (metadata.title) {
    // Check if title ends with key in brackets, e.g. "Be Thou My Vision [D]"
    const titleKeyMatch = metadata.title.match(/(.*?)\s*\[([A-G][#b]?m?)\]$/i);
    if (titleKeyMatch) {
      metadata.title = titleKeyMatch[1].trim();
      metadata.originalKey = titleKeyMatch[2];
    }
  }
  
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
