import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createSong, updateSong } from './worshipService';
import { useAuth } from '../../context/AuthContext';
import ModernDropdown from '../../components/ui/ModernDropdown';

export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const str = url.trim();

  // Match embed URL (works for full iframe code paste as well)
  const embedMatch = str.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Match watch URL
  const watchMatch = str.match(/v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Match youtu.be URL
  const shortMatch = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Match shorts URL
  const shortsMatch = str.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function SongFormModal({ isOpen, onClose, song, onSaved }) {
  const { userProfile, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    composer: '',
    defaultKey: '',
    originalKey: '',
    tempoBpm: '',
    timeSignature: '',
    tags: '',
    status: 'active',
    allowPublicLyrics: false,
    directoryVisibility: 'hidden',
    allowLyricsInDirectory: false,
    language: 'english',
    category: 'contemporary',
    youtubeUrl: '',
    lyrics: '',
    chordChart: '',
    copyrightInfo: '',
    ccliSongNumber: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || song.artistName || song.bandName || '',
        composer: song.composer || '',
        defaultKey: song.defaultKey || '',
        originalKey: song.originalKey || '',
        tempoBpm: song.tempoBpm || '',
        timeSignature: song.timeSignature || '',
        tags: song.tags ? song.tags.join(', ') : '',
        status: song.status || 'active',
        allowPublicLyrics: song.allowPublicLyrics || false,
        directoryVisibility: song.directoryVisibility || 'hidden',
        allowLyricsInDirectory: song.allowLyricsInDirectory !== undefined ? song.allowLyricsInDirectory : (song.allowPublicLyrics || false),
        language: song.language || 'english',
        category: song.category || 'contemporary',
        youtubeUrl: song.mediaReferences?.youtubeUrl || song.youtubeUrl || '',
        lyrics: song.lyrics || '',
        chordChart: song.chordChart || '',
        copyrightInfo: song.copyrightInfo || song.copyrightOwner || '',
        ccliSongNumber: song.ccliSongNumber || ''
      });
    } else {
      setFormData({
        title: '',
        artist: '',
        composer: '',
        defaultKey: '',
        originalKey: '',
        tempoBpm: '',
        timeSignature: '',
        tags: '',
        status: 'active',
        allowPublicLyrics: false,
        directoryVisibility: 'hidden',
        allowLyricsInDirectory: false,
        language: 'english',
        category: 'contemporary',
        youtubeUrl: '',
        lyrics: '',
        chordChart: '',
        copyrightInfo: '',
        ccliSongNumber: ''
      });
    }
  }, [song, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLyricsPaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const lines = pastedText.split('\n');
    const chordRegex = /^[A-G][#b]?(?:m|min|maj|dim|aug|sus)?\d?(?:\/[A-G][#b]?)?$/;
    
    let lyricsLines = [];
    let detectedKey = formData.defaultKey;
    let hasChords = false;

    const isChordLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false;

      const tokens = trimmed.split(/\s+/);
      let chordTokens = 0;
      
      for (const token of tokens) {
        if (token.toUpperCase() === 'N.C.') {
          chordTokens++;
          continue;
        }
        const cleanToken = token.replace(/[.,;!?]$/, '');
        if (chordRegex.test(cleanToken)) {
          chordTokens++;
        }
      }
      return (chordTokens / tokens.length) > 0.5;
    };

    lines.forEach(line => {
      if (isChordLine(line)) {
        hasChords = true;
        if (!detectedKey) {
          const firstToken = line.trim().split(/\s+/)[0];
          if (firstToken && firstToken.toUpperCase() !== 'N.C.') {
            const keyMatch = firstToken.match(/^[A-G][#b]?/);
            if (keyMatch) detectedKey = keyMatch[0];
          }
        }
      } else {
        lyricsLines.push(line);
      }
    });

    // If we detected chords, we take over the paste behavior
    if (hasChords) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        lyrics: lyricsLines.join('\n'),
        chordChart: pastedText,
        defaultKey: detectedKey
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    
    setSaving(true);
    try {
      const videoId = extractYouTubeVideoId(formData.youtubeUrl);
      const mediaReferences = videoId ? {
        provider: 'youtube',
        youtubeUrl: formData.youtubeUrl,
        youtubeVideoId: videoId,
        youtubeTitle: formData.title || '',
        youtubeThumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      } : null;

      const dataToSave = {
        ...formData,
        allowPublicLyrics: Boolean(formData.allowLyricsInDirectory),
        mediaReferences: mediaReferences || null,
        youtubeVideoId: videoId || null,
        churchId: userProfile?.churchId || null,
        tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : (formData.tags || []),
        tempoBpm: formData.tempoBpm ? Number(formData.tempoBpm) : null,
        createdBy: currentUser?.uid || null
      };
      
      if (song) {
        await updateSong(song.id, dataToSave);
      } else {
        await createSong(dataToSave);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save song');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-church-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-church-navy">
            {song ? 'Edit Song' : 'Add New Song'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form id="song-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Title *</label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  value={formData.title} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-church-navy mb-2">Artist / Band</label>
                  <input 
                    type="text" 
                    name="artist" 
                    value={formData.artist} 
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-church-navy mb-2">Composer</label>
                  <input 
                    type="text" 
                    name="composer" 
                    value={formData.composer} 
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Default Key</label>
                <input 
                  type="text" 
                  name="defaultKey"
                  placeholder="e.g. G, C#"
                  value={formData.defaultKey} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Tempo (BPM)</label>
                <input 
                  type="number" 
                  name="tempoBpm" 
                  value={formData.tempoBpm} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Status</label>
                <ModernDropdown
                  value={formData.status}
                  onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'archived', label: 'Archived' }
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Language</label>
                <ModernDropdown
                  value={formData.language}
                  onChange={(val) => handleChange({ target: { name: 'language', value: val } })}
                  options={[
                    { value: 'english', label: 'English' },
                    { value: 'tagalog', label: 'Tagalog' },
                    { value: 'ilocano', label: 'Ilocano' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Category</label>
                <ModernDropdown
                  value={formData.category}
                  onChange={(val) => handleChange({ target: { name: 'category', value: val } })}
                  options={[
                    { value: 'hymn', label: 'Hymn' },
                    { value: 'contemporary', label: 'Contemporary' },
                    { value: 'psalm', label: 'Psalm' },
                    { value: 'praise', label: 'Praise' },
                    { value: 'worship', label: 'Worship' },
                    { value: 'response', label: 'Response' },
                    { value: 'offertory', label: 'Offertory' },
                    { value: 'communion', label: 'Communion' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Tags (comma separated)</label>
              <input 
                type="text" 
                name="tags"
                placeholder="e.g. Praise, Fast, Easter"
                value={formData.tags} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">YouTube Reference Link</label>
              <input 
                type="text" 
                name="youtubeUrl"
                placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={formData.youtubeUrl} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
              />
              {extractYouTubeVideoId(formData.youtubeUrl) && (
                <div className="mt-3 flex items-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <img 
                    src={`https://img.youtube.com/vi/${extractYouTubeVideoId(formData.youtubeUrl)}/hqdefault.jpg`} 
                    alt="YouTube Preview" 
                    className="w-24 h-16 object-cover rounded-lg mr-3 border border-red-200 shadow-sm"
                  />
                  <div>
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">YouTube Reference Preview</span>
                    <span className="text-xs text-gray-600">Video ID: <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-800 font-mono text-xs">{extractYouTubeVideoId(formData.youtubeUrl)}</code></span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-100 pt-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <h3 className="text-base font-bold text-church-navy mb-1">Mobile Community Directory</h3>
              <p className="text-xs text-church-slate mb-4">
                Songs marked Members Only or Public will appear in the mobile Community Songs Directory. Chords and worship arrangement details remain available only through assigned worship duties.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-church-navy mb-2">Directory Visibility</label>
                  <ModernDropdown
                    value={formData.directoryVisibility}
                    onChange={(val) => handleChange({ target: { name: 'directoryVisibility', value: val } })}
                    options={[
                      { value: 'hidden', label: 'Hidden' },
                      { value: 'members_only', label: 'Members Only' },
                      { value: 'public', label: 'Public' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-church-navy mb-2">Allow Lyrics in Directory</label>
                  <ModernDropdown
                    value={formData.allowLyricsInDirectory ? 'yes' : 'no'}
                    onChange={(val) => handleChange({ target: { name: 'allowLyricsInDirectory', type: 'checkbox', checked: val === 'yes' } })}
                    options={[
                      { value: 'no', label: 'No' },
                      { value: 'yes', label: 'Yes' }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-church-navy mb-2">Lyrics</label>
              <textarea 
                name="lyrics" 
                rows={6}
                value={formData.lyrics} 
                onChange={handleChange}
                onPaste={handleLyricsPaste}
                placeholder="Paste lyrics with chords here to auto-detect!"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green font-mono text-sm" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Chord Chart / Notes</label>
              <textarea 
                name="chordChart" 
                rows={4}
                value={formData.chordChart} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green font-mono text-sm" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">Copyright / License Info</label>
                <input 
                  type="text" 
                  name="copyrightInfo"
                  placeholder="e.g. Sovereign Grace Worship"
                  value={formData.copyrightInfo} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-church-navy mb-2">CCLI Song Number</label>
                <input 
                  type="text" 
                  name="ccliSongNumber"
                  placeholder="e.g. 7096627"
                  value={formData.ccliSongNumber} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
                />
              </div>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-church-slate hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="song-form"
            disabled={saving}
            className="px-5 py-2.5 bg-church-green text-white text-sm font-semibold rounded-xl hover:bg-church-green/90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Song'}
          </button>
        </div>
      </div>
    </div>
  );
}
