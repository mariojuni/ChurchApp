import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSongImportSettings, updateSongImportSettings } from './worshipService';
import ModernDropdown from '../../components/ui/ModernDropdown';

export default function ImportSettingsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [settings, setSettings] = useState({
    defaultImportSource: 'songselect_pdf',
    defaultChordFormat: 'chordpro',
    defaultVisibility: 'worship_team_only',
    autoDetectTitle: true,
    autoDetectKey: true,
    autoDetectTempo: true,
    autoDetectTimeSignature: true,
    autoDetectCcliSongNumber: true,
    autoDetectCopyright: true,
    autoDetectLicenseNumber: true,
    useCopyrightOwnerAsBandName: true,
    useAuthorLineAsComposer: true,
    importAsDraft: true,
    requirePreviewBeforeSave: true,
    duplicateCheckEnabled: true,
    duplicateCheckByTitle: true,
    duplicateCheckByCcliSongNumber: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userProfile?.churchId) return;
      try {
        const data = await getSongImportSettings(userProfile.churchId);
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Error fetching settings', err);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [userProfile?.churchId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userProfile?.churchId) return;
    
    setSaving(true);
    try {
      await updateSongImportSettings(userProfile.churchId, settings);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings', err);
      alert('Failed to save settings.');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-church-slate">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/admin/worship/songs')} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-church-navy flex items-center">
            <Settings size={28} className="mr-3 text-church-green" />
            Song Import Settings
          </h1>
          <p className="text-sm text-church-slate mt-1">Configure default behaviors when importing song PDFs.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Parsing Options */}
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-church-navy mb-4 border-b border-gray-100 pb-2">PDF Parser Defaults</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectTitle" checked={settings.autoDetectTitle} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect Title</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectKey" checked={settings.autoDetectKey} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect Key</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectTempo" checked={settings.autoDetectTempo} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect Tempo</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectTimeSignature" checked={settings.autoDetectTimeSignature} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect Time Signature</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectCcliSongNumber" checked={settings.autoDetectCcliSongNumber} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect CCLI Song #</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectCopyright" checked={settings.autoDetectCopyright} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect Copyright</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="autoDetectLicenseNumber" checked={settings.autoDetectLicenseNumber} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Auto-detect CCLI License #</span>
            </label>
          </div>

          <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="useCopyrightOwnerAsBandName" checked={settings.useCopyrightOwnerAsBandName} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <div>
                <span className="text-sm font-semibold text-church-navy">Use Copyright Owner as Band Name</span>
                <p className="text-xs text-gray-500">Extract publisher names as artist/band name if missing.</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="useAuthorLineAsComposer" checked={settings.useAuthorLineAsComposer} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <div>
                <span className="text-sm font-semibold text-church-navy">Use Subtitle Line as Composer</span>
                <p className="text-xs text-gray-500">Typically the line below the Title contains the authors/composers.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Import Workflow */}
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-church-navy mb-4 border-b border-gray-100 pb-2">Import Workflow</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Default Format</label>
              <ModernDropdown
                value={settings.defaultChordFormat}
                onChange={(val) => handleChange({ target: { name: 'defaultChordFormat', value: val } })}
                options={[
                  { value: 'chordpro', label: 'ChordPro (Recommended)' },
                  { value: 'plain_text', label: 'Plain Text' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Default Visibility</label>
              <ModernDropdown
                value={settings.defaultVisibility}
                onChange={(val) => handleChange({ target: { name: 'defaultVisibility', value: val } })}
                options={[
                  { value: 'worship_team_only', label: 'Worship Team Only' },
                  { value: 'church_members', label: 'Church Members' },
                  { value: 'private', label: 'Private (Admin only)' }
                ]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="importAsDraft" checked={settings.importAsDraft} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Save Imported Songs as Draft by default</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="requirePreviewBeforeSave" checked={settings.requirePreviewBeforeSave} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Require manual preview and confirmation before saving</span>
            </label>
          </div>
        </div>

        {/* Duplicate Detection */}
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-church-navy mb-4 border-b border-gray-100 pb-2">Duplicate Detection</h3>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" name="duplicateCheckEnabled" checked={settings.duplicateCheckEnabled} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
              <span className="text-sm font-semibold text-church-navy">Enable Duplicate Checking</span>
            </label>
            
            {settings.duplicateCheckEnabled && (
              <div className="ml-8 space-y-4 border-l-2 border-gray-100 pl-4">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" name="duplicateCheckByTitle" checked={settings.duplicateCheckByTitle} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
                  <span className="text-sm font-semibold text-gray-700">Check by Song Title</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" name="duplicateCheckByCcliSongNumber" checked={settings.duplicateCheckByCcliSongNumber} onChange={handleChange} className="w-5 h-5 rounded text-church-green focus:ring-church-green" />
                  <span className="text-sm font-semibold text-gray-700">Check by CCLI Song Number</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center px-6 py-3 bg-church-green text-white font-bold rounded-xl shadow-md hover:bg-church-green/90 transition-all disabled:opacity-50"
          >
            <Save size={20} className="mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}
