import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, History } from 'lucide-react';

const BooksModal = ({ isOpen, onClose, books, onSelectChapter }) => {
  const [expandedBook, setExpandedBook] = useState(null);
  const [sortMode, setSortMode] = useState('Traditional'); // 'Traditional' | 'Alphabetical'

  if (!isOpen) return null;

  const sortedBooks = [...(books || [])].sort((a, b) => {
    if (sortMode === 'Alphabetical') {
      return (a.title || a.name).localeCompare(b.title || b.name);
    }
    // Traditional sorting assumes books are already in canonical order from API
    return 0;
  });

  const handleBookTap = (bookId) => {
    setExpandedBook(expandedBook === bookId ? null : bookId);
  };

  const renderChapters = (book) => {
    // YouVersion returns book.chapters = [{ id: "1", passage_id: "GEN.1", title: "1", ... }]
    const chapters = book.chapters || [];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
        {chapters.map(chapter => (
          <button 
            key={chapter.id}
            onClick={() => onSelectChapter(book.id, chapter.id)}
            style={{ 
              padding: '12px 0', 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 'bold'
            }}
          >
            {chapter.title || chapter.id}
          </button>
        ))}
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-sheet-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <button className="close-btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)' }}>
            <X size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Books</h2>
          <button className="close-btn" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <History size={20} />
          </button>
        </div>

        {/* Book List */}
        <div className="scroll-content" style={{ flex: 1, overflowY: 'auto' }}>
          {sortedBooks.map(book => (
            <div key={book.id}>
              <button 
                onClick={() => handleBookTap(book.id)}
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  padding: '16px', 
                  background: expandedBook === book.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {book.title || book.name}
              </button>
              {expandedBook === book.id && renderChapters(book)}
            </div>
          ))}
        </div>

        {/* Segmented Control */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '24px', padding: '4px' }}>
            <button 
              onClick={() => setSortMode('Traditional')}
              style={{ 
                flex: 1, 
                padding: '10px', 
                borderRadius: '20px', 
                border: 'none',
                background: sortMode === 'Traditional' ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Traditional
            </button>
            <button 
              onClick={() => setSortMode('Alphabetical')}
              style={{ 
                flex: 1, 
                padding: '10px', 
                borderRadius: '20px', 
                border: 'none',
                background: sortMode === 'Alphabetical' ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Alphabetical
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.querySelector('.app-container') || document.body
  );
};

export default BooksModal;
