import React, { useState, useEffect } from 'react';
import { ArrowLeft, UploadCloud, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { 
  getSongImportSettings, 
  createSong, 
  createSongVersion, 
  checkDuplicateSong 
} from './worshipService';
import { parseWorshipPdf } from './utils/pdfParser';
import { convertToChordPro } from './utils/chordProConverter';

export default function ImportSongPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  
  const [settings, setSettings] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, parsing, preview, saving, success
  const [error, setError] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    artistName: '',
    bandName: '',
    originalKey: '',
    tempoBpm: '',
    timeSignature: '',
    ccliSongNumber: '',
    copyrightYear: '',
    copyrightOwner: '',
    ccliLicenseNumber: '',
    lyricsWithChords: '',
    lyricsOnly: ''
  });

  useEffect(() => {
    if (userProfile?.churchId) {
      getSongImportSettings(userProfile.churchId).then(data => {
        if (data) setSettings(data);
        else {
          // Defaults
          setSettings({
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
            duplicateCheckEnabled: true,
            defaultVisibility: 'worship_team_only',
            defaultChordFormat: 'chordpro'
          });
        }
      });
    }
  }, [userProfile?.churchId]);

  const handleFileDrop = async (e) => {
    e.preventDefault();
    if (status === 'parsing') return;
    
    const droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (!droppedFile || droppedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    
    setFile(droppedFile);
    processFile(droppedFile);
  };

  const processFile = async (pdfFile) => {
    setStatus('parsing');
    setError(null);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const parsedData = await parseWorshipPdf(arrayBuffer);
      
      const chordProData = convertToChordPro(parsedData.lines, parsedData.metadata?.title);
      
      const meta = parsedData.metadata;
      
      setFormData({
        title: settings?.autoDetectTitle ? meta.title : '',
        composer: settings?.useAuthorLineAsComposer ? meta.composer : '',
        artistName: (settings?.useCopyrightOwnerAsBandName && meta.copyrightOwner) ? meta.copyrightOwner : '',
        bandName: (settings?.useCopyrightOwnerAsBandName && meta.copyrightOwner) ? meta.copyrightOwner : '',
        originalKey: settings?.autoDetectKey ? meta.originalKey : '',
        tempoBpm: settings?.autoDetectTempo ? meta.tempoBpm : '',
        timeSignature: settings?.autoDetectTimeSignature ? meta.timeSignature : '',
        ccliSongNumber: settings?.autoDetectCcliSongNumber ? meta.ccliSongNumber : '',
        copyrightYear: settings?.autoDetectCopyright ? meta.copyrightYear : '',
        copyrightOwner: settings?.autoDetectCopyright ? meta.copyrightOwner : '',
        ccliLicenseNumber: settings?.autoDetectLicenseNumber ? meta.ccliLicenseNumber : '',
        lyricsWithChords: chordProData.chordChart,
        lyricsOnly: chordProData.lyricsOnly
      });
      
      setStatus('preview');
    } catch (err) {
      console.error(err);
      setError(`Failed to parse PDF: ${err.message || err.toString()}`);
      setStatus('idle');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmSave = async (forceSave = false) => {
    if (!formData.title || !userProfile?.churchId) {
      setError("Title is required.");
      return;
    }
    
    if (settings?.duplicateCheckEnabled && !forceSave) {
      const dups = await checkDuplicateSong(
        userProfile.churchId, 
        settings.duplicateCheckByTitle ? formData.title : null,
        settings.duplicateCheckByCcliSongNumber ? formData.ccliSongNumber : null
      );
      if (dups.length > 0) {
        setDuplicates(dups);
        return; // Pause and show duplicate warning
      }
    }

    setStatus('saving');
    try {
      // 1. Upload PDF
      let sourceFileUrl = null;
      if (file) {
        const storageRef = ref(storage, `worship/pdfs/${userProfile.churchId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        sourceFileUrl = await getDownloadURL(storageRef);
      }

      // 2. Create Song
      const songId = await createSong({
        churchId: userProfile.churchId,
        createdBy: currentUser.uid,
        title: formData.title,
        artistName: formData.artistName,
        bandName: formData.bandName,
        composer: formData.composer,
        ccliSongNumber: formData.ccliSongNumber,
        ccliLicenseNumber: formData.ccliLicenseNumber,
        originalKey: formData.originalKey,
        defaultKey: formData.originalKey, // Same for now
        tempoBpm: formData.tempoBpm ? Number(formData.tempoBpm) : null,
        timeSignature: formData.timeSignature,
        copyrightYear: formData.copyrightYear,
        copyrightOwner: formData.copyrightOwner,
        visibility: settings?.defaultVisibility || 'worship_team_only',
        status: settings?.importAsDraft ? 'draft' : 'active',
        // Now using separated strings
        lyrics: formData.lyricsOnly,
        chordChart: formData.lyricsWithChords
      });

      // 3. Create SongVersion
      await createSongVersion({
        songId,
        churchId: userProfile.churchId,
        versionName: 'Original Import',
        originalKey: formData.originalKey,
        defaultDisplayKey: formData.originalKey,
        chordFormat: settings?.defaultChordFormat || 'chordpro',
        lyricsWithChords: formData.lyricsWithChords,
        tempoBpm: formData.tempoBpm ? Number(formData.tempoBpm) : null,
        timeSignature: formData.timeSignature,
        sourceFileUrl,
        importedFrom: 'songselect_pdf'
      });

      setStatus('success');
    } catch (err) {
      console.error(err);
      setError('Failed to save song to database.');
      setStatus('preview');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/admin/worship/songs')} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Import Song</h1>
          <p className="text-sm text-church-slate mt-1">Upload a PDF to automatically extract lyrics, chords, and metadata.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center">
          <AlertTriangle size={20} className="mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="p-6 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-orange-900 flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            Duplicate Warning
          </h3>
          <p className="text-sm text-orange-800">
            We found {duplicates.length} song(s) in your library with a similar Title or CCLI Number.
          </p>
          <ul className="list-disc list-inside text-sm text-orange-700">
            {duplicates.map(d => <li key={d.id}>{d.title} (CCLI: {d.ccliSongNumber || 'N/A'})</li>)}
          </ul>
          <div className="flex space-x-4 pt-2">
            <button 
              onClick={() => setDuplicates([])}
              className="px-4 py-2 bg-white text-orange-700 border border-orange-200 rounded-xl text-sm font-bold"
            >
              Cancel Import
            </button>
            <button 
              onClick={() => { setDuplicates([]); handleConfirmSave(true); }}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700"
            >
              Import Anyway
            </button>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-3xl p-12 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => document.getElementById('pdf-upload').click()}
        >
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <UploadCloud size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">Drag & Drop PDF Here</h3>
          <p className="text-church-slate text-sm mb-6">or click to browse from your computer (SongSelect PDF format recommended)</p>
          <input 
            type="file" 
            id="pdf-upload" 
            accept="application/pdf" 
            className="hidden" 
            onChange={handleFileDrop}
          />
          <button className="px-6 py-3 bg-church-green text-white font-bold rounded-full shadow-md hover:bg-church-green/90">
            Select PDF File
          </button>
        </div>
      )}

      {status === 'parsing' && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-church-green mb-4"></div>
          <h3 className="text-xl font-bold text-church-navy">Analyzing PDF...</h3>
          <p className="text-sm text-church-slate mt-2">Extracting chords and positioning lyrics via A.I.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-church-navy mb-2">Song Imported Successfully!</h3>
          <p className="text-church-slate mb-8">The song has been saved to your library.</p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => { setStatus('idle'); setFile(null); }}
              className="px-6 py-3 bg-white border border-gray-200 text-church-navy font-bold rounded-full hover:bg-gray-50"
            >
              Import Another
            </button>
            <button 
              onClick={() => navigate('/admin/worship/songs')}
              className="px-6 py-3 bg-church-green text-white font-bold rounded-full hover:bg-church-green/90 shadow-md"
            >
              Back to Library
            </button>
          </div>
        </div>
      )}

      {status === 'preview' && (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          
          {/* Form Side */}
          <div className="w-full md:w-1/2 p-8 border-r border-gray-100 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-church-navy flex items-center">
                <FileText size={24} className="mr-2 text-church-green" />
                Extracted Metadata
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Title *</label>
                <input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Composer</label>
                  <input type="text" name="composer" value={formData.composer} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Artist/Band</label>
                  <input type="text" name="artistName" value={formData.artistName} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Key</label>
                  <input type="text" name="originalKey" value={formData.originalKey} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Tempo</label>
                  <input type="text" name="tempoBpm" value={formData.tempoBpm} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Time Sig</label>
                  <input type="text" name="timeSignature" value={formData.timeSignature} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-church-navy mb-3">Licensing Details</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">CCLI Song #</label>
                      <input type="text" name="ccliSongNumber" value={formData.ccliSongNumber} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">CCLI License #</label>
                      <input type="text" name="ccliLicenseNumber" value={formData.ccliLicenseNumber} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-church-slate mb-1 uppercase tracking-wider">Copyright Owner</label>
                    <input type="text" name="copyrightOwner" value={formData.copyrightOwner} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="bg-yellow-50 p-4 rounded-xl mb-6">
                <p className="text-xs text-yellow-800 font-medium leading-relaxed">
                  <strong>Licensing Reminder:</strong> Please make sure your church has permission or proper licensing (e.g. CCLI) before storing, copying, projecting, or sharing this song.
                </p>
              </div>
              <button 
                onClick={() => handleConfirmSave(false)}
                className="w-full px-6 py-3 bg-church-green text-white font-bold rounded-xl shadow-md hover:bg-church-green/90"
              >
                Confirm & Save Song
              </button>
            </div>
          </div>

          {/* Lyrics Preview Side */}
          <div className="w-full md:w-1/2 bg-gray-50 p-8 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-church-navy uppercase tracking-wider">Lyrics & Chords (ChordPro)</h3>
            </div>
            <textarea 
              name="lyricsWithChords"
              value={formData.lyricsWithChords}
              onChange={handleInputChange}
              className="flex-1 w-full bg-white border border-gray-200 rounded-xl p-4 font-mono text-sm leading-relaxed focus:outline-none focus:border-church-green shadow-inner resize-none"
            />
          </div>

        </div>
      )}
    </div>
  );
}
