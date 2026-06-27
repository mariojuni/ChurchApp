import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Search, Globe2, ChevronRight, CloudDownload, CheckCircle, Loader2 } from 'lucide-react';
import { fetchBiblesByLanguage, saveVersion, downloadBibleOffline } from '../../utils/bibleApi';

const POPULAR_LANGUAGES = [
  { id: 'eng', language: 'eng', display_names: { en: 'English' } },
  { id: 'Fil', language: 'Fil', display_names: { en: 'Filipino / Tagalog' } },
  { id: 'spa', language: 'spa', display_names: { en: 'Spanish' } },
  { id: 'fra', language: 'fra', display_names: { en: 'French' } },
  { id: 'deu', language: 'deu', display_names: { en: 'German' } },
  { id: 'zho', language: 'zho', display_names: { en: 'Chinese' } },
  { id: 'jpn', language: 'jpn', display_names: { en: 'Japanese' } },
  { id: 'kor', language: 'kor', display_names: { en: 'Korean' } },
  { id: 'rus', language: 'rus', display_names: { en: 'Russian' } },
  { id: 'por', language: 'por', display_names: { en: 'Portuguese' } },
  { id: 'ind', language: 'ind', display_names: { en: 'Indonesian' } }
];

const BibleLanguagesModal = ({ isOpen, onClose, savedVersionIds = [], onVersionAdded }) => {
  const [languages, setLanguages] = useState(POPULAR_LANGUAGES);
  const [bibles, setBibles] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLanguages(POPULAR_LANGUAGES);
      setSelectedLanguage(null);
      setBibles([]);
      setDownloadingId(null);
    }
  }, [isOpen]);

  const handleSelectLanguage = async (lang) => {
    setSelectedLanguage(lang);
    setIsLoading(true);
    const biblesData = await fetchBiblesByLanguage(lang.language);
    setBibles(biblesData);
    setIsLoading(false);
  };

  const handleSelectTranslation = async (bible) => {
    if (downloadingId) return; // Prevent multiple clicks

    if (savedVersionIds.includes(bible.id)) {
      if (onVersionAdded) onVersionAdded(bible);
      return;
    }
    
    setDownloadingId(bible.id);
    saveVersion(bible);
    await downloadBibleOffline(bible.id);
    setDownloadingId(null);
    if (onVersionAdded) onVersionAdded(bible);
  };

  if (!isOpen) return null;

  const filteredLanguages = languages.filter(lang => 
    (lang.display_names?.en || lang.language).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 0, height: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-sheet-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedLanguage && (
              <button 
                onClick={() => setSelectedLanguage(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: 0 }}
              >
                <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {selectedLanguage ? `Bibles in ${selectedLanguage.display_names?.en || selectedLanguage.language}` : "Discover Versions"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: 0 }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="scroll-content" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
               Loading...
            </div>
          ) : !selectedLanguage ? (
            // LANGUAGE LIST
            <>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Search languages..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 40px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredLanguages.map(lang => (
                  <div 
                    key={lang.id}
                    onClick={() => handleSelectLanguage(lang)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '16px 4px', 
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {lang.display_names?.en || lang.language}
                      </h3>
                      {lang.display_names?.en !== lang.display_names?.[lang.language] && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {lang.display_names?.[lang.language]}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" opacity={0.5} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            // BIBLES LIST FOR SELECTED LANGUAGE
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {bibles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No Bibles found for this language.
                </div>
              ) : (
                bibles.map(bible => {
                  const isDownloaded = savedVersionIds.includes(bible.id);
                  const isDownloading = downloadingId === bible.id;

                  return (
                    <div 
                      key={bible.id}
                      onClick={() => handleSelectTranslation(bible)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '16px 8px', 
                        cursor: isDownloading ? 'not-allowed' : 'pointer',
                        borderBottom: '1px solid var(--border)',
                        opacity: isDownloading ? 0.6 : 1
                      }}
                    >
                      <div style={{ width: '48px', height: '48px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '16px', flexShrink: 0, fontSize: '11px', textAlign: 'center', padding: '4px', wordBreak: 'break-word', lineHeight: '1.2' }}>
                        {bible.abbreviation || bible.localized_abbreviation}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                          {bible.title || bible.localized_title}
                        </h3>
                        {bible.publisher_url && (
                          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                             Official Publisher Version
                          </p>
                        )}
                      </div>
                      
                      <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                        {isDownloading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '12px', fontWeight: '600' }}>
                             Loading...
                          </div>
                        ) : isDownloaded ? (
                          <CheckCircle size={20} color="var(--success)" />
                        ) : (
                          <CloudDownload size={20} color="var(--primary)" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          
          <div className="bottom-spacer" style={{height: 100}}></div>
        </div>
      </div>
    </div>,
    document.querySelector('.app-container') || document.body
  );
};

export default BibleLanguagesModal;
