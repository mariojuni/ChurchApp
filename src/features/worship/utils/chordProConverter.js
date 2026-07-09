export const convertToChordPro = (lines, title = '') => {
  const CHORD_REGEX = /^[A-G][#b]?(?:m|min|maj|dim|aug|sus)?\d?(?:sus)?\d?(?:\/[A-G][#b]?)?$/i;
  const SECTION_HEADERS = ['VERSE', 'CHORUS', 'BRIDGE', 'TAG', 'INTRO', 'OUTRO', 'PRE-CHORUS', 'INTERLUDE', 'TURNAROUND'];

  const isChordLine = (line) => {
    const tokens = line.text.split(/\s+/).filter(t => t.trim().length > 0);
    if (tokens.length === 0) return false;
    
    let chordCount = 0;
    let validTokenCount = 0;
    
    for (const t of tokens) {
      const cleanT = t.replace(/[.,;!?()|:\[\]\u200B-\u200D\uFEFF\u200E\u200F]/g, '');
      
      // If the token was purely musical notation (e.g. ||:, |, .), consider it a valid chord item
      if (cleanT.length === 0) {
        chordCount++;
        validTokenCount++;
        continue;
      }
      
      validTokenCount++;
      if (CHORD_REGEX.test(cleanT) || cleanT.toUpperCase() === 'NC') {
        chordCount++;
      }
    }
    
    // Lower threshold to 0.5 to allow for parenthetical notes like (To Instr.)
    return validTokenCount > 0 && (chordCount / validTokenCount) >= 0.5;
  };

  const isSectionHeader = (line) => {
    const text = line.text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').toUpperCase().trim();
    return SECTION_HEADERS.some(header => text.includes(header) && text.indexOf(header) < 5);
  };

  const isFooterLine = (line) => {
    const text = line.text.toUpperCase();
    return text.includes('CCLI SONG') || 
           text.includes('CCLI LICEN') ||
           text.includes('©') ||
           text.includes('SONGSELECT') ||
           text.includes('ALL RIGHTS RESERVED') ||
           text.startsWith('NOTE: REPRODUCTION') ||
           text.includes('MUSIC REPRODUCTION LICENCE') ||
           /^\d+$/.test(text.trim()) ||
           (title && text.includes(title.toUpperCase() + ' - '));
  };

  let formattedLines = [];
  let lyricsOnlyLines = [];
  let footerLines = new Set(); // Use Set to avoid duplicate footers across multiple pages
  let currentChordLine = null;
  let hasStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isFooterLine(line)) {
      footerLines.add(line.text.trim());
      continue;
    }

    if (isSectionHeader(line)) {
      hasStarted = true;
      formattedLines.push('');
      lyricsOnlyLines.push('');
      // Format like [Verse 1]
      let headerText = line.text.trim();
      if (!headerText.startsWith('[')) headerText = '[' + headerText;
      if (!headerText.endsWith(']')) headerText = headerText + ']';
      
      // Capitalize properly
      headerText = headerText.replace(/\[\w+/g, match => {
        return '[' + match.substring(1).charAt(0).toUpperCase() + match.substring(2).toLowerCase();
      });
      
      formattedLines.push(headerText);
      lyricsOnlyLines.push(headerText);
      currentChordLine = null;
      continue;
    }

    if (isChordLine(line)) {
      hasStarted = true;
      if (currentChordLine) {
        // We had a hanging chord line (like an intro), just output it spaced out
        formattedLines.push(buildPaddedChordLine(currentChordLine, null));
      }
      currentChordLine = line;
      continue;
    }

    // It's a lyric line
    if (currentChordLine) {
      // We have chords to map to these lyrics
      const { chordString, lyricString } = mergeOverUnder(currentChordLine, line);
      formattedLines.push(chordString);
      formattedLines.push(lyricString);
      lyricsOnlyLines.push(lyricString);
      currentChordLine = null;
    } else {
      // It's just lyrics, no chords
      if (hasStarted && line.text.trim()) {
         formattedLines.push(line.text);
         lyricsOnlyLines.push(line.text);
      }
    }
  }

  // Flush any remaining chords
  if (currentChordLine) {
    formattedLines.push(buildPaddedChordLine(currentChordLine, null));
  }

  // Clean up excessive newlines
  let finalChordChart = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  let finalLyricsOnly = lyricsOnlyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // Append footers to the chord chart only, separated by a double newline
  if (footerLines.size > 0) {
    const footerText = Array.from(footerLines).join('\n');
    finalChordChart += '\n\n' + footerText;
  }

  return {
    chordChart: finalChordChart,
    lyricsOnly: finalLyricsOnly
  };
};

function buildPaddedChordLine(chordLine, lyricLine) {
  if (!lyricLine || lyricLine.items.length === 0) {
    // No lyrics to align to, just use approximate spacing between chord items
    let result = '';
    let lastX = 0;
    chordLine.items.forEach((item, index) => {
      if (index === 0) {
        result += item.str;
      } else {
        const gap = item.x - lastX;
        const spaces = Math.max(1, Math.round(gap / 10)); // rough estimate of space width
        result += ' '.repeat(spaces) + item.str;
      }
      lastX = item.x + item.width;
    });
    return result;
  }

  // We have a lyric line to align to!
  const lyricStartX = lyricLine.items[0].x;
  const lyricEndX = lyricLine.items[lyricLine.items.length - 1].x + lyricLine.items[lyricLine.items.length - 1].width;
  const lyricWidth = lyricEndX - lyricStartX;
  const lyricText = lyricLine.text;

  if (lyricWidth <= 0 || !lyricText) {
    return chordLine.text;
  }

  // Build a chord string padded with spaces
  let chordStringArr = new Array(lyricText.length + 20).fill(' '); // extra buffer at the end

  chordLine.items.forEach(chordItem => {
    const chords = chordItem.str.split(/\s+/).filter(c => c.trim());
    
    for (const c of chords) {
      if (!c) continue;
      
      const chordX = chordItem.x;
      let ratio = (chordX - lyricStartX) / lyricWidth;
      
      // If chord is before lyrics start, allow negative index (we'll prepend later)
      // For simplicity, we just floor it at 0 unless it's way before
      
      let targetIndex = Math.round(ratio * lyricText.length);
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex >= chordStringArr.length) targetIndex = chordStringArr.length - 1;

      // Ensure we don't overwrite another chord (find next empty spot)
      while (targetIndex < chordStringArr.length && chordStringArr[targetIndex] !== ' ') {
        targetIndex++;
      }

      // Insert chord chars
      for (let i = 0; i < c.length; i++) {
        if (targetIndex + i < chordStringArr.length) {
          chordStringArr[targetIndex + i] = c[i];
        }
      }
    }
  });

  return chordStringArr.join('').trimEnd();
}

function mergeOverUnder(chordLine, lyricLine) {
  const chordString = buildPaddedChordLine(chordLine, lyricLine);
  return {
    chordString,
    lyricString: lyricLine.text
  };
}
