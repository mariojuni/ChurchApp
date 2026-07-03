import React, { useState, useEffect } from 'react';
import { X, UploadCloud, Film, Headphones, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

const CHURCH_ID = 'casubiduan'; // Hardcoded for this spec
const TABS = ['Details', 'Media', 'Publishing'];

export default function SermonFormModal({ isOpen, onClose, sermon = null }) {
  const [activeTab, setActiveTab] = useState('Details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Details State
  const [formData, setFormData] = useState({
    title: '',
    speakerName: '',
    passage: '',
    book: '',
    chapter: '',
    seriesId: '',
    category: 'Sunday Worship',
    preachedDate: '',
    description: '',
    duration: '', // Optional in seconds or minutes
    visibility: 'public'
  });

  // Media State (File Objects)
  const [mediaFiles, setMediaFiles] = useState({
    audio: null,
    video: null,
    thumbnail: null,
    notes: null
  });

  // Upload Progress
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState('draft'); // draft, uploading, ready, published, failed

  useEffect(() => {
    if (sermon) {
      setFormData({
        title: sermon.title || '',
        speakerName: sermon.speakerName || '',
        passage: sermon.passage || '',
        book: sermon.book || '',
        chapter: sermon.chapter || '',
        seriesId: sermon.seriesId || '',
        category: sermon.category || 'Sunday Worship',
        preachedDate: sermon.preachedDate || '',
        description: sermon.description || '',
        duration: sermon.duration || '',
        visibility: sermon.visibility || 'public'
      });
      setUploadStatus(sermon.status || 'draft');
    } else {
      setFormData({
        title: '',
        speakerName: '',
        passage: '',
        book: '',
        chapter: '',
        seriesId: '',
        category: 'Sunday Worship',
        preachedDate: new Date().toISOString().split('T')[0],
        description: '',
        duration: '',
        visibility: 'public'
      });
      setUploadStatus('draft');
    }
    setMediaFiles({ audio: null, video: null, thumbnail: null, notes: null });
    setUploadProgress({});
    setActiveTab('Details');
    setError('');
  }, [sermon, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const uploadFile = async (sermonId, file, type, folderName) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }
      
      const storagePath = `sermons/${folderName}/${sermonId}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [type]: progress }));
        },
        (err) => {
          console.error(`Upload error for ${type}:`, err);
          reject(err);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ path: storagePath, url: downloadURL });
        }
      );
    });
  };

  const handlePublish = async (statusOverride = 'published') => {
    // Basic validation
    if (!formData.title || !formData.speakerName || !formData.preachedDate) {
      setError("Please fill in the required details (Title, Speaker, Date).");
      setActiveTab('Details');
      return;
    }

    setLoading(true);
    setError('');
    setUploadStatus('uploading');

    try {
      // 1. Determine Document ID (Create new or use existing)
      const sermonsColRef = collection(db, 'churches', CHURCH_ID, 'sermons');
      const docRef = sermon ? doc(db, 'churches', CHURCH_ID, 'sermons', sermon.id) : doc(sermonsColRef);
      const sermonId = docRef.id;

      // 2. Upload Files if any
      const [audioRes, videoRes, thumbRes, notesRes] = await Promise.all([
        uploadFile(sermonId, mediaFiles.audio, 'audio', 'audio'),
        uploadFile(sermonId, mediaFiles.video, 'video', 'video'),
        uploadFile(sermonId, mediaFiles.thumbnail, 'thumbnail', 'thumbnail'),
        uploadFile(sermonId, mediaFiles.notes, 'notes', 'notes'),
      ]);

      // 3. Construct Firestore Document
      const sermonDoc = {
        ...formData,
        status: statusOverride,
        updatedAt: serverTimestamp(),
      };

      // Add media paths/urls only if newly uploaded, otherwise preserve existing
      if (audioRes) {
        sermonDoc.audioPath = audioRes.path;
        sermonDoc.audioUrl = audioRes.url;
      }
      if (videoRes) {
        sermonDoc.videoPath = videoRes.path;
        sermonDoc.videoUrl = videoRes.url;
      }
      if (thumbRes) {
        sermonDoc.thumbnailPath = thumbRes.path;
        sermonDoc.thumbnailUrl = thumbRes.url;
      }
      if (notesRes) {
        sermonDoc.notesPath = notesRes.path;
        sermonDoc.notesUrl = notesRes.url;
      }

      if (!sermon) {
        sermonDoc.createdAt = serverTimestamp();
        sermonDoc.createdBy = 'adminUid'; // Hardcoded for MVP
      }

      // 4. Save to Firestore
      await setDoc(docRef, sermonDoc, { merge: true });
      
      setUploadStatus(statusOverride);
      setTimeout(() => onClose(), 1000); // close after 1s showing success
    } catch (err) {
      console.error(err);
      setUploadStatus('failed');
      setError('Failed to process sermon. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFileUploader = (type, label, accept, Icon) => {
    const file = mediaFiles[type];
    const progress = uploadProgress[type];
    const existingUrl = sermon && sermon[`${type}Url`];

    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative overflow-hidden">
        {progress !== undefined && progress < 100 && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-church-green transition-all" 
            style={{ width: `${progress}%` }} 
          />
        )}
        <Icon size={24} className="text-gray-400 mb-2" />
        <p className="text-sm font-medium text-church-navy">{label}</p>
        
        {file ? (
          <p className="text-xs text-church-green font-bold mt-1 truncate max-w-[200px]">{file.name}</p>
        ) : existingUrl ? (
          <p className="text-xs text-blue-600 font-medium mt-1">File uploaded previously</p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">Click to select file</p>
        )}
        
        <input 
          type="file" 
          accept={accept} 
          onChange={(e) => handleFileChange(e, type)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-church-soft overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-bg">
          <h2 className="text-xl font-bold text-church-navy">{sermon ? 'Edit Sermon' : 'Create Sermon'}</h2>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-2 bg-church-bg">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={loading}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-church-green text-church-green' 
                  : 'border-transparent text-gray-500 hover:text-church-navy'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 flex-1">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'Details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Title *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleTextChange} placeholder="e.g. Faith That Moves Mountains" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Speaker *</label>
                  <input type="text" name="speakerName" value={formData.speakerName} onChange={handleTextChange} placeholder="e.g. Pastor Daniel" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Passage</label>
                  <input type="text" name="passage" value={formData.passage} onChange={handleTextChange} placeholder="e.g. Matthew 17:20" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Book</label>
                  <input type="text" name="book" value={formData.book} onChange={handleTextChange} placeholder="e.g. Matthew" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Chapter</label>
                  <input type="text" name="chapter" value={formData.chapter} onChange={handleTextChange} placeholder="e.g. 17" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Series</label>
                  <input type="text" name="seriesId" value={formData.seriesId} onChange={handleTextChange} placeholder="e.g. Faith and Obedience" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleTextChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none bg-white">
                    <option value="Sunday Worship">Sunday Worship</option>
                    <option value="Bible Study">Bible Study</option>
                    <option value="Youth Service">Youth Service</option>
                    <option value="Special Event">Special Event</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Date Preached *</label>
                  <input type="date" name="preachedDate" value={formData.preachedDate} onChange={handleTextChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Duration (seconds)</label>
                  <input type="number" name="duration" value={formData.duration} onChange={handleTextChange} placeholder="e.g. 2520" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Description</label>
                <textarea name="description" rows="3" value={formData.description} onChange={handleTextChange} placeholder="Sermon summary..." className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none resize-none" />
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA */}
          {activeTab === 'Media' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm flex items-start">
                <UploadCloud className="shrink-0 mr-3 mt-0.5" size={18} />
                <p>Upload files directly to Firebase Cloud Storage. For audio, MP3 (96-128kbps) is recommended for optimal mobile app streaming performance.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {renderFileUploader('audio', 'Upload Audio (MP3)', 'audio/*', Headphones)}
                {renderFileUploader('video', 'Upload Video (MP4)', 'video/*', Film)}
                {renderFileUploader('thumbnail', 'Upload Thumbnail (JPG/PNG)', 'image/*', ImageIcon)}
                {renderFileUploader('notes', 'Upload Notes (PDF)', 'application/pdf', FileText)}
              </div>
            </div>
          )}

          {/* TAB 3: PUBLISHING */}
          {activeTab === 'Publishing' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Visibility</label>
                  <select name="visibility" value={formData.visibility} onChange={handleTextChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none bg-white">
                    <option value="public">Public (Everyone)</option>
                    <option value="members">Members Only</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Current Status</label>
                  <div className="px-4 py-2 bg-gray-100 rounded-xl font-medium text-gray-700 capitalize">
                    {uploadStatus}
                  </div>
                </div>
              </div>

              {uploadStatus === 'uploading' && (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 border-4 border-church-green border-t-transparent rounded-full animate-spin mb-3"></div>
                  <h3 className="font-bold text-church-navy">Uploading & Processing...</h3>
                  <p className="text-sm text-church-slate">Please do not close this window while files are uploading to Storage.</p>
                </div>
              )}

              {uploadStatus === 'published' && (
                <div className="p-6 bg-green-50 border border-green-200 rounded-2xl flex flex-col items-center justify-center text-center">
                  <CheckCircle2 size={40} className="text-green-600 mb-2" />
                  <h3 className="font-bold text-green-800">Published Successfully</h3>
                  <p className="text-sm text-green-700">This sermon is now live on the mobile app.</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <div>
            {activeTab !== 'Details' && (
              <button 
                type="button" 
                disabled={loading}
                onClick={() => setActiveTab(TABS[TABS.indexOf(activeTab) - 1])}
                className="px-4 py-2 text-sm font-medium text-church-slate hover:text-church-navy"
              >
                ← Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {activeTab !== 'Publishing' ? (
              <button 
                type="button" 
                onClick={() => setActiveTab(TABS[TABS.indexOf(activeTab) + 1])}
                className="px-6 py-2 bg-church-navy text-white rounded-full text-sm font-medium hover:bg-church-navy/90"
              >
                Continue
              </button>
            ) : (
              <>
                <button 
                  onClick={() => handlePublish('draft')}
                  disabled={loading}
                  className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50"
                >
                  Save Draft
                </button>
                <button 
                  onClick={() => handlePublish('published')}
                  disabled={loading}
                  className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 shadow-sm"
                >
                  Publish Now
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
