import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Settings, Search, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { fetchChapterHTML } from '../../utils/bibleApi';

const highlightColors = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  pink: 'rgba(255, 101, 150, 0.3)',
  blue: 'rgba(77, 139, 255, 0.3)',
  green: 'rgba(74, 222, 128, 0.3)',
};

const processHTML = (rawHtml) => {
   if (!rawHtml) return null;
   const parser = new DOMParser();
   const doc = parser.parseFromString(rawHtml, 'text/html');
   let currentVerse = null;
   const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ALL);
   let node;
   const nodesToWrap = [];
   while ((node = walker.nextNode())) {
       if (node.nodeType === 1 && node.classList.contains('yv-v')) {
           currentVerse = node.getAttribute('v');
       } else if (node.nodeType === 3 && currentVerse && node.textContent.trim().length > 0) {
           if (node.parentNode && node.parentNode.classList.contains('v-wrap')) continue;
           nodesToWrap.push({ node, verse: currentVerse });
       }
   }
   nodesToWrap.forEach(({ node, verse }) => {
        const span = doc.createElement('span');
        span.className = `v-wrap v-${verse}`;
        span.dataset.v = verse;
        node.parentNode.insertBefore(span, node);
        span.appendChild(node);
   });
   return doc.body.innerHTML;
};

const BibleReader = ({ preferences, updatePreferences, onOpenBooks, onOpenVersionManager, books, activeVersionObj }) => {
  const [chapterHTML, setChapterHTML] = useState(null);
  const [selectedVerses, setSelectedVerses] = useState([]);

  const { activeTranslation, activeBook, activeChapter } = preferences;

  useEffect(() => {
    const loadChapter = async () => {
      setSelectedVerses([]);
      // YouVersion passage ID format is typically GEN.1
      const passageId = `${activeBook}.${activeChapter}`;
      const data = await fetchChapterHTML(activeTranslation, passageId);
      setChapterHTML(processHTML(data));
      
      // Scroll to the top of the content when a new chapter loads
      const scrollContainer = document.querySelector('.screens');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    loadChapter();
  }, [activeTranslation, activeBook, activeChapter]);

  const handlePrevChapter = () => {
    const bookIndex = books.findIndex(b => b.id === activeBook);
    if (bookIndex === -1) return;
    const currentBook = books[bookIndex];
    const chapterIndex = currentBook.chapters?.findIndex(c => String(c.id) === String(activeChapter));

    if (chapterIndex > 0) {
      const prevChapter = currentBook.chapters[chapterIndex - 1];
      updatePreferences({ activeChapter: prevChapter.id });
    } else if (bookIndex > 0) {
      const prevBook = books[bookIndex - 1];
      if (prevBook && prevBook.chapters && prevBook.chapters.length > 0) {
        const lastChapter = prevBook.chapters[prevBook.chapters.length - 1];
        updatePreferences({ activeBook: prevBook.id, activeChapter: lastChapter.id });
      }
    }
  };

  const handleNextChapter = () => {
    const bookIndex = books.findIndex(b => b.id === activeBook);
    if (bookIndex === -1) return;
    const currentBook = books[bookIndex];
    const chapterIndex = currentBook.chapters?.findIndex(c => String(c.id) === String(activeChapter));
    
    if (chapterIndex !== -1 && chapterIndex < (currentBook.chapters?.length - 1)) {
      const nextChapter = currentBook.chapters[chapterIndex + 1];
      updatePreferences({ activeChapter: nextChapter.id });
    } else if (bookIndex < books.length - 1) {
      const nextBook = books[bookIndex + 1];
      if (nextBook && nextBook.chapters && nextBook.chapters.length > 0) {
        const firstChapter = nextBook.chapters[0];
        updatePreferences({ activeBook: nextBook.id, activeChapter: firstChapter.id });
      }
    }
  };

  const handleContentClick = (e) => {
    const wrap = e.target.closest('.v-wrap');
    if (wrap) {
       const v = wrap.dataset.v;
       setSelectedVerses(prev => 
         prev.includes(v) ? prev.filter(id => id !== v) : [...prev, v]
       );
    } else {
       const vlbl = e.target.closest('.yv-vlbl');
       if (vlbl) {
           const v = vlbl.previousSibling?.getAttribute('v') || vlbl.innerText;
           if (v) {
              setSelectedVerses(prev => 
                prev.includes(v) ? prev.filter(id => id !== v) : [...prev, v]
              );
           }
       } else {
           setSelectedVerses([]);
       }
    }
  };

  const currentBook = books.find(b => b.id === activeBook);
  const currentBookName = currentBook?.title || currentBook?.name || activeBook;
  const rawAcronym = activeVersionObj?.localized_abbreviation || activeVersionObj?.abbreviation || activeVersionObj?.shortName || activeTranslation || 'BIBLE';
  const versionAcronym = String(rawAcronym).toUpperCase();

  const passageId = `${activeBook}.${activeChapter}`;
  const chapterHighlights = (preferences.highlights && preferences.highlights[passageId]) || {};

  const handleHighlight = (color) => {
     const newHighlights = { ...(preferences.highlights || {}) };
     if (!newHighlights[passageId]) newHighlights[passageId] = {};
     selectedVerses.forEach(v => {
        if (color === 'clear') {
           delete newHighlights[passageId][v];
        } else {
           newHighlights[passageId][v] = color;
        }
     });
     updatePreferences({ highlights: newHighlights });
     setSelectedVerses([]);
  };

  const handleCopy = () => {
      // Find all selected elements, sort them by document position, extract text
      const elements = Array.from(document.querySelectorAll(selectedVerses.map(v => `.v-wrap.v-${v}`).join(', ')));
      let text = elements.map(el => el.textContent).join(' ').replace(/\s+/g, ' ');
      navigator.clipboard.writeText(text).catch(err => console.error("Copy failed", err));
      setSelectedVerses([]);
  };

  return (
    <>
      <style>{`
        ${Object.entries(chapterHighlights).map(([v, color]) => `.v-wrap.v-${v} { background-color: ${highlightColors[color] || color} !important; border-radius: 4px; }`).join('\n')}
        ${selectedVerses.map(v => `.v-wrap.v-${v} { background-color: rgba(255,101,150,0.15) !important; border-bottom: 2px dashed var(--primary) !important; cursor: pointer; }`).join('\n')}
      `}</style>

      {ReactDOM.createPortal(
        <header className="top-bar" style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, 
          paddingTop: 'max(env(safe-area-inset-top), 24px)', 
          paddingBottom: '12px', 
          zIndex: 100,
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          borderTopLeftRadius: '40px',
          borderTopRightRadius: '40px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'var(--surface)', 
              borderRadius: 'var(--radius-pill)', 
              padding: '4px',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)'
            }}
          >
            <button 
              style={{ padding: '8px 16px', fontSize: '14px', fontWeight: '700', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              onClick={onOpenBooks}
            >
              {currentBookName} {activeChapter}
            </button>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }}></div>
            <button 
              style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '800', background: 'var(--bg-gradient)', borderRadius: 'var(--radius-pill)', border: 'none', color: 'var(--primary)', cursor: 'pointer', textTransform: 'uppercase' }}
              onClick={onOpenVersionManager}
            >
              {versionAcronym}
            </button>
          </div>
        </header>,
        document.querySelector('.app-container') || document.body
      )}

      {/* Spacer to push content below the fixed header */}
      <div style={{ height: 'calc(max(env(safe-area-inset-top), 24px) + 60px)' }}></div>

      <div className="scroll-content" onClick={handleContentClick}>
        {chapterHTML ? (
          <div 
            className="bible-text youversion-content"
            dangerouslySetInnerHTML={{ __html: chapterHTML }} 
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Error loading chapter.</div>
        )}

        <div className="bottom-spacer" style={{height: 80}}></div>
      </div>

      {selectedVerses.length > 0 && ReactDOM.createPortal(
        <div className="bible-action-toolbar">
           <button className="bible-action-btn" onClick={handleCopy}>
             <Copy size={20} />
             <span>Copy</span>
           </button>
           
           <div className="highlight-color-picker">
              {Object.keys(highlightColors).map(color => (
                 <button 
                   key={color} 
                   className="color-dot" 
                   style={{ background: highlightColors[color] }}
                   onClick={() => handleHighlight(color)}
                 />
              ))}
              <button 
                className="color-dot" 
                style={{ background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}
                onClick={() => handleHighlight('clear')}
              >
                 <X size={14} color="var(--text-primary)" />
              </button>
           </div>
        </div>,
        document.querySelector('.app-container') || document.body
      )}

      {/* Floating Navigation Arrows - Portaled to avoid scrolling with content */}
      {!selectedVerses.length && ReactDOM.createPortal(
        <div style={{ 
          position: 'absolute', 
          bottom: '100px', // Bit more space from the bottom nav bar
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '0 20px', 
          pointerEvents: 'none', // So clicking between arrows passes through
          zIndex: 50 
        }}>
           <button 
              onClick={handlePrevChapter} 
              style={{ 
                padding: '10px', 
                borderRadius: '50%', 
                background: 'var(--surface-glass)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'var(--primary)', 
                border: '1px solid var(--border)', 
                pointerEvents: 'auto',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronLeft size={20} />
            </button>
           <button 
              onClick={handleNextChapter} 
              style={{ 
                padding: '10px', 
                borderRadius: '50%', 
                background: 'var(--surface-glass)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'var(--primary)', 
                border: '1px solid var(--border)', 
                pointerEvents: 'auto',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronRight size={20} />
            </button>
        </div>,
        document.querySelector('.app-container') || document.body
      )}
    </>
  );
};

export default BibleReader;
