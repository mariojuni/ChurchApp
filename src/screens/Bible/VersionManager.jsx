import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CloudDownload, Settings, Plus, Trash2 } from 'lucide-react';
import { removeVersion, fetchOrganization } from '../../utils/bibleApi';

const VersionManager = ({ isOpen, savedVersions, activeTranslation, onSelectVersion, onDiscover, onClose, refreshSavedVersions, onAddVersionClick }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [publishers, setPublishers] = useState({});

  useEffect(() => {
    const fetchPublishers = async () => {
      const newPublishers = { ...publishers };
      const missingOrgs = savedVersions
        .map(v => v.organization_id)
        .filter(id => id && !newPublishers[id]);
      
      const uniqueOrgs = [...new Set(missingOrgs)];

      await Promise.all(uniqueOrgs.map(async (orgId) => {
        const data = await fetchOrganization(orgId);
        newPublishers[orgId] = data ? data.name : 'Public Domain';
      }));
      setPublishers(newPublishers);
    };

    if (isOpen) {
      fetchPublishers();
    }
  }, [isOpen, savedVersions]);

  if (!isOpen) return null;

  const handleRemove = (e, id) => {
    e.stopPropagation();
    removeVersion(id);
    refreshSavedVersions();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
        <div className="modal-sheet-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>My Versions</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={onAddVersionClick || onDiscover} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}
          >
            <Plus size={20} />
          </button>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="scroll-content" style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {savedVersions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No versions saved yet. Click the + icon to discover translations.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {savedVersions.map(version => (
              <div 
                key={version.id}
                onClick={() => !isEditMode && onSelectVersion(version.id)}
                className="card"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px', 
                  cursor: isEditMode ? 'default' : 'pointer',
                  border: activeTranslation === version.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: 'var(--bg-card)'
                }}
              >
                {isEditMode && (
                  <button 
                    onClick={(e) => handleRemove(e, version.id)}
                    style={{ background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'rgba(0,0,0,0.05)', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 'bold', 
                  marginRight: '14px', 
                  flexShrink: 0,
                  fontSize: '11px',
                  textAlign: 'center',
                  padding: '4px',
                  wordBreak: 'break-word',
                  lineHeight: '1.2',
                  whiteSpace: 'pre-wrap'
                }}>
                  {(() => {
                    const abbr = String(version.abbreviation || version.shortName || version.id || '');
                    return abbr.replace(/(\d{2,})$/, '\n$1');
                  })()}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {publishers[version.organization_id] || (version.organization_id ? 'Loading...' : 'Public Domain')}
                  </p>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {version.title || version.name}
                  </h3>
                </div>

                {!isEditMode && (
                  <CloudDownload size={20} color="var(--text-secondary)" style={{ marginLeft: '16px' }} />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="bottom-spacer" style={{height: 100}}></div>
      </div>
      </div>
    </div>,
    document.querySelector('.app-container') || document.body
  );
};

export default VersionManager;
