import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Film, Headphones, Image as ImageIcon, CheckCircle2, Scissors, Settings, Play } from 'lucide-react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { trimMedia, compressAudio, compressVideo, generateThumbnail } from '../../utils/mediaProcessor';

const STEPS = ['Details', 'Upload', 'Trim', 'Thumbnail', 'Optimize', 'Review'];
const EDIT_STEPS = ['Details', 'Review'];

export default function SermonFormModal({ isOpen, onClose, sermon = null }) {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  // In edit mode we use a simplified 2-step flow; new uploads use the full 6-step flow
  const isEditMode = Boolean(sermon);
  const ACTIVE_STEPS = isEditMode ? EDIT_STEPS : STEPS;

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = ACTIVE_STEPS[activeStepIndex];
  
  const [loading, setLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(''); // 'uploading_media', 'uploading_thumb', 'saving', 'done'
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preacherName: '',
    sermonDate: new Date().toISOString().split('T')[0],
    scriptureReference: '',
    seriesTitle: '',
    mediaType: 'audio',
  });

  // Media State
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  
  // Trim State
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);
  
  // Thumbnail State
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [thumbnailTime, setThumbnailTime] = useState(0);
  
  // Optimization State
  const [optimizedFile, setOptimizedFile] = useState(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Upload State
  const [uploadProgress, setUploadProgress] = useState({ media: 0, thumbnail: 0 });
  const [uploadStatus, setUploadStatus] = useState('draft'); // draft, processing, ready, published, failed

  useEffect(() => {
    if (sermon) {
      setFormData({
        title: sermon.title || '',
        description: sermon.description || '',
        preacherName: sermon.preacherName || '',
        sermonDate: sermon.sermonDate || '',
        scriptureReference: sermon.scriptureReference || '',
        seriesTitle: sermon.seriesTitle || '',
        mediaType: sermon.mediaType || 'audio',
      });
      setThumbnailPreviewUrl(sermon.thumbnailUrl || '');
      setUploadStatus(sermon.status || 'draft');
    } else {
      setFormData({
        title: '',
        description: '',
        preacherName: '',
        sermonDate: new Date().toISOString().split('T')[0],
        scriptureReference: '',
        seriesTitle: '',
        mediaType: 'audio',
      });
      setUploadStatus('draft');
    }
    resetMediaState();
    setActiveStepIndex(0);
    setError('');
  }, [sermon, isOpen]);
  
  const resetMediaState = () => {
    setMediaFile(null);
    setMediaPreviewUrl('');
    setTrimStart(0);
    setTrimEnd(0);
    setDuration(0);
    setThumbnailFile(null);
    setThumbnailPreviewUrl('');
    setThumbnailTime(0);
    setOptimizedFile(null);
    setOptimizationProgress(0);
    setIsOptimizing(false);
    setUploadProgress({ media: 0, thumbnail: 0 });
  }

  if (!isOpen) return null;

  const handleTextChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);
    
    // Auto-detect type
    if (file.type.startsWith('video/')) {
      setFormData(prev => ({ ...prev, mediaType: 'video' }));
    } else {
      setFormData(prev => ({ ...prev, mediaType: 'audio' }));
    }
  };

  const handleMediaLoaded = (e) => {
    const dur = Math.floor(e.target.duration);
    setDuration(dur);
    if (trimEnd === 0) setTrimEnd(dur);
  };

  const handleGenerateThumbnail = async () => {
    if (!mediaFile || !mediaFile.type.startsWith('video/')) return;
    try {
      setLoading(true);
      const thumbFile = await generateThumbnail(mediaFile, thumbnailTime);
      setThumbnailFile(thumbFile);
      setThumbnailPreviewUrl(URL.createObjectURL(thumbFile));
    } catch (err) {
      setError("Failed to generate thumbnail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  const MAX_CLIENT_SIZE = 150 * 1024 * 1024; // 150MB

  const handleOptimize = async () => {
    if (!mediaFile) return;
    // Server-Side Optimization Bypass
    // We now just use the raw file and let the Cloud Function handle the heavy lifting.
    setOptimizedFile(mediaFile);
    nextStep();
  };

  const uploadFileToStorage = async (sermonId, file, folder, progressKey) => {
    if (!file) return null;
    // For video media, upload to the raw folder so the Cloud Function can optimize it
    const actualFolder = (folder === 'media' && formData.mediaType === 'video') ? 'media/raw' : folder;
    const storagePath = `churches/${CHURCH_ID}/sermons/${sermonId}/${actualFolder}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (progressKey) {
            setUploadProgress(prev => ({ ...prev, [progressKey]: prog }));
          }
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ path: storagePath, url });
        }
      );
    });
  };

  const handlePublish = async (statusOverride = 'published') => {
    setIsPublishing(true);
    setError('');
    setPublishStep('uploading');
    setUploadStatus('processing');
    
    try {
      const sermonsColRef = collection(db, 'sermons');
      const docRef = sermon ? doc(db, 'sermons', sermon.id) : doc(sermonsColRef);
      const sermonId = docRef.id;

      // Upload files — either can be null (skipped steps)
      const fileToUpload = optimizedFile || mediaFile;
      const [mediaRes, thumbRes] = await Promise.all([
        fileToUpload
          ? uploadFileToStorage(sermonId, fileToUpload, formData.mediaType, 'media')
          : Promise.resolve(null),
        thumbnailFile
          ? uploadFileToStorage(sermonId, thumbnailFile, 'thumbnails', 'thumbnail')
          : Promise.resolve(null),
      ]);

      setPublishStep('saving');

      const sermonDoc = {
        id: sermonId,
        churchId: CHURCH_ID,
        title: formData.title,
        description: formData.description,
        preacherName: formData.preacherName,
        sermonDate: formData.sermonDate,
        scriptureReference: formData.scriptureReference,
        seriesTitle: formData.seriesTitle,
        status: statusOverride,
        mediaType: formData.mediaType,
        durationSeconds: (trimEnd - trimStart) || duration || 0,
        originalSizeBytes: mediaFile ? mediaFile.size : 0,
        optimizedSizeBytes: optimizedFile ? optimizedFile.size : (mediaFile ? mediaFile.size : 0),
        trimStartSeconds: trimStart,
        trimEndSeconds: trimEnd,
        updatedAt: serverTimestamp(),
      };

      if (mediaRes) {
        if (formData.mediaType === 'audio') {
          sermonDoc.audioStoragePath = mediaRes.path;
          sermonDoc.audioUrl = mediaRes.url;
        } else {
          sermonDoc.videoStoragePath = mediaRes.path;
          sermonDoc.videoUrl = mediaRes.url;
        }
      }
      
      if (thumbRes) {
        sermonDoc.thumbnailStoragePath = thumbRes.path;
        sermonDoc.thumbnailUrl = thumbRes.url;
      }

      if (!sermon) {
        sermonDoc.createdAt = serverTimestamp();
        sermonDoc.createdBy = userProfile?.uid || 'admin';
      }
      
      if (statusOverride === 'published') {
        sermonDoc.publishedAt = serverTimestamp();
        sermonDoc.publishedBy = userProfile?.uid || 'admin';
      }

      await setDoc(docRef, sermonDoc, { merge: true });
      
      setPublishStep('done');
      setUploadStatus(statusOverride);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('handlePublish error:', err);
      setUploadStatus('failed');
      setPublishStep('');
      const msg = err?.code
        ? `[${err.code}]: ${err.message}`
        : (err.message || 'Unknown error. Check your internet connection.');
      const fullMsg = 'Upload failed — ' + msg;
      setError(fullMsg);
      // Also alert so the user sees it without needing DevTools
      alert('⚠️ ' + fullMsg);
    } finally {
      setIsPublishing(false);
    }
  };


  // Save details-only edit (no file re-upload needed)
  const handleSaveDetails = async (statusOverride) => {
    setIsPublishing(true);
    setError('');
    try {
      const docRef = doc(db, 'sermons', sermon.id);
      await updateDoc(docRef, {
        title: formData.title,
        description: formData.description,
        preacherName: formData.preacherName,
        sermonDate: formData.sermonDate,
        scriptureReference: formData.scriptureReference,
        seriesTitle: formData.seriesTitle,
        status: statusOverride || uploadStatus,
        updatedAt: serverTimestamp(),
      });
      setUploadStatus(statusOverride || uploadStatus);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      console.error(err);
      setError('Failed to save: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const nextStep = () => {
    if (activeStepIndex < ACTIVE_STEPS.length - 1) setActiveStepIndex(prev => prev + 1);
  };

  const prevStep = () => {
    if (activeStepIndex > 0) setActiveStepIndex(prev => prev - 1);
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8 relative">
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10 -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-0 h-0.5 bg-church-green -z-10 -translate-y-1/2 transition-all" style={{ width: `${(activeStepIndex / (ACTIVE_STEPS.length - 1)) * 100}%` }}></div>
      
      {ACTIVE_STEPS.map((step, idx) => (
        <div key={step} className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
            idx <= activeStepIndex ? 'bg-church-green border-church-green text-white' : 'bg-white border-gray-300 text-gray-400'
          }`}>
            {idx < activeStepIndex ? <CheckCircle2 size={16} /> : idx + 1}
          </div>
          <span className={`text-xs mt-1 font-medium ${idx <= activeStepIndex ? 'text-church-navy' : 'text-gray-400'}`}>{step}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-church-soft flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-church-navy">
              {isEditMode ? 'Edit Sermon' : 'Sermon Upload Studio'}
            </h2>
            <p className="text-sm text-church-slate mt-1">
              {isEditMode ? 'Update sermon details without re-uploading media.' : 'Easily process and publish your sermons.'}
            </p>
          </div>
          <button onClick={onClose} disabled={isPublishing || isOptimizing} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Content Area */}
        <div className="overflow-y-auto p-8 flex-1">
          {renderStepIndicator()}
          
          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          
          {/* STEP 1: DETAILS */}
          {activeStep === 'Details' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Sermon Title *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleTextChange} placeholder="e.g. Faith That Moves Mountains" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Preacher *</label>
                  <input type="text" name="preacherName" value={formData.preacherName} onChange={handleTextChange} placeholder="e.g. Pastor Daniel" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Date Preached *</label>
                  <input type="date" name="sermonDate" value={formData.sermonDate} onChange={handleTextChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Scripture Ref</label>
                  <input type="text" name="scriptureReference" value={formData.scriptureReference} onChange={handleTextChange} placeholder="e.g. Matthew 17:20" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Series</label>
                  <input type="text" name="seriesTitle" value={formData.seriesTitle} onChange={handleTextChange} placeholder="e.g. The Gospel" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Description</label>
                <textarea name="description" rows="3" value={formData.description} onChange={handleTextChange} placeholder="Sermon summary..." className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none resize-none" />
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD MEDIA */}
          {activeStep === 'Upload' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center py-8">
              <div className="w-full max-w-lg border-2 border-dashed border-gray-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
                <UploadCloud size={48} className="text-church-green mb-4" />
                <h3 className="text-lg font-bold text-church-navy mb-2">Upload Audio or Video</h3>
                <p className="text-sm text-church-slate mb-6">Select the raw recording file. We will optimize it for you.</p>
                
                <input 
                  type="file" 
                  accept="audio/*,video/*" 
                  onChange={handleMediaUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <button className="px-6 py-2.5 bg-church-navy text-white rounded-full text-sm font-medium pointer-events-none">
                  Select File
                </button>
              </div>
              
              {mediaFile && (
                <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-2xl w-full max-w-lg flex items-center">
                  {formData.mediaType === 'video' ? <Film className="text-green-600 mr-3" /> : <Headphones className="text-green-600 mr-3" />}
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-green-800 text-sm truncate">{mediaFile.name}</p>
                    <p className="text-xs text-green-600">{(mediaFile.size / (1024 * 1024)).toFixed(2)} MB • {formData.mediaType}</p>
                  </div>
                  <CheckCircle2 className="text-green-600" />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TRIM */}
          {activeStep === 'Trim' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
              {!mediaPreviewUrl ? (
                <div className="text-center py-10 text-gray-500">Please upload media first.</div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden mb-6 aspect-video flex items-center justify-center">
                    {formData.mediaType === 'video' ? (
                      <video 
                        ref={videoRef}
                        src={mediaPreviewUrl} 
                        controls 
                        onLoadedMetadata={handleMediaLoaded}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <audio 
                        src={mediaPreviewUrl} 
                        controls 
                        onLoadedMetadata={handleMediaLoaded}
                        className="w-full"
                      />
                    )}
                  </div>
                  
                  <div className="w-full max-w-2xl bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-church-navy flex items-center"><Scissors size={18} className="mr-2 text-church-slate" /> Trim Media</h3>
                      <span className="text-sm text-church-slate font-medium">Duration: {duration}s</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-church-slate mb-1">Start Time (seconds)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max={trimEnd - 1} 
                          value={trimStart} 
                          onChange={e => setTrimStart(Number(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-church-slate mb-1">End Time (seconds)</label>
                        <input 
                          type="number" 
                          min={trimStart + 1} 
                          max={duration} 
                          value={trimEnd} 
                          onChange={e => setTrimEnd(Number(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: THUMBNAIL */}
          {activeStep === 'Thumbnail' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
                
                {formData.mediaType === 'video' && (
                  <div className="flex-1 bg-gray-50 p-6 rounded-3xl border border-gray-200 w-full max-w-md">
                    <h3 className="font-bold text-church-navy mb-4 flex items-center"><Film size={18} className="mr-2 text-church-slate" /> Extract from Video</h3>
                    <div className="mb-6">
                      <label className="block text-xs font-medium text-church-slate mb-3 flex justify-between">
                        <span>Slide to find a frame (Seconds)</span>
                        <span className="font-bold text-church-navy">{Number(thumbnailTime).toFixed(1)}s</span>
                      </label>
                      <input 
                        type="range" 
                        min={trimStart} 
                        max={trimEnd || duration || 100} 
                        step="0.5"
                        value={thumbnailTime} 
                        onChange={e => setThumbnailTime(Number(e.target.value))}
                        onMouseUp={handleGenerateThumbnail}
                        onTouchEnd={handleGenerateThumbnail}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-church-green" 
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{trimStart}s</span>
                        <span>{trimEnd || duration || 0}s</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleGenerateThumbnail}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-church-navy text-white rounded-xl text-sm font-medium hover:bg-church-navy/90"
                    >
                      {loading ? 'Extracting...' : 'Extract Frame'}
                    </button>
                  </div>
                )}
                
                <div className="flex-1 w-full max-w-md">
                  <h3 className="font-bold text-church-navy mb-4">Thumbnail Preview</h3>
                  <div className="w-full aspect-video bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 overflow-hidden relative flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
                    {thumbnailPreviewUrl ? (
                      <img src={thumbnailPreviewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon size={32} className="text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 font-medium">No Thumbnail</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleThumbnailUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Upload custom thumbnail"
                    />
                  </div>
                  <p className="text-xs text-center text-church-slate mt-2">Click image to upload custom file</p>
                </div>

              </div>
            </div>
          )}

          {/* STEP 5: OPTIMIZE */}
          {activeStep === 'Optimize' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
                  <Globe size={40} />
                </div>
                <h3 className="text-xl font-bold text-church-navy mb-2">Cloud Optimization Ready</h3>
                <p className="text-sm text-church-slate mb-6">
                  We've upgraded our system! Videos are now automatically optimized to 720p on our fast cloud servers after upload. This prevents your browser from crashing on large files.
                </p>
                <button
                  onClick={handleOptimize}
                  className="px-6 py-3 bg-church-blue text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Continue to Review
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {activeStep === 'Review' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 flex flex-col md:flex-row gap-8">
                
                <div className="w-full md:w-1/3 aspect-video bg-gray-200 rounded-2xl overflow-hidden relative shadow-sm">
                  {thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-gray-400" /></div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-bold uppercase backdrop-blur-sm">
                    {formData.mediaType}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-church-navy mb-1">{formData.title}</h3>
                  <p className="text-sm font-medium text-church-slate mb-4">{formData.preacherName} • {formData.sermonDate}</p>
                  
                  {formData.scriptureReference && (
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded mb-4">
                      {formData.scriptureReference}
                    </span>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{formData.description}</p>
                  
                  {isEditMode ? (
                    // Edit mode: show existing media info
                    <div className="flex items-center space-x-4 text-xs font-bold text-gray-500 bg-white p-3 rounded-xl border border-gray-200 inline-flex shadow-sm">
                      {sermon.videoUrl && <span>✅ Video uploaded</span>}
                      {sermon.audioUrl && <span>✅ Audio uploaded</span>}
                      {!sermon.videoUrl && !sermon.audioUrl && <span className="text-yellow-600">⚠️ No media file</span>}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4 text-xs font-bold text-gray-500 bg-white p-3 rounded-xl border border-gray-200 inline-flex shadow-sm">
                      <span>Trims: {trimStart}s - {trimEnd}s</span>
                      <span>•</span>
                      <span>Size: {(optimizedFile?.size || mediaFile?.size || 0) / (1024*1024) | 0} MB</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Progress Bar — shows during upload */}
              {(uploadStatus === 'processing' || isPublishing) && (
                <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                  <h3 className="font-bold text-blue-800 mb-1">
                    {isEditMode
                      ? 'Saving Changes...'
                      : publishStep === 'saving'
                        ? '⬆️ Saving to database...'
                        : '⬆️ Uploading media file...'}
                  </h3>
                  <p className="text-xs text-blue-600 mb-3">
                    {publishStep === 'saving'
                      ? 'Upload complete! Writing to database...'
                      : 'Please keep this tab open while uploading.'}
                  </p>
                  {!isEditMode && (
                    <div className="space-y-2 max-w-sm mx-auto">
                      <div className="flex justify-between text-xs font-medium text-blue-700">
                        <span>Media</span>
                        <span>{Math.round(uploadProgress.media || 0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress.media || 0}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              
              {uploadStatus === 'published' && (
                <div className="p-6 bg-green-50 border border-green-100 rounded-2xl flex flex-col items-center justify-center text-center">
                  <CheckCircle2 size={32} className="text-green-600 mb-2" />
                  <h3 className="font-bold text-green-800">{isEditMode ? 'Saved Successfully' : 'Published Successfully'}</h3>
                </div>
              )}
              
              {(uploadStatus === 'draft' || uploadStatus === 'processing') && !isPublishing && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-center">
                  <p className="text-sm text-yellow-800 font-medium">
                    {isEditMode
                      ? 'Review your changes above, then save.'
                      : 'Ready to publish! You can save as a draft or publish immediately to the mobile app.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <div>
            {activeStepIndex > 0 && activeStep !== 'Review' && (
              <button 
                type="button" 
                onClick={prevStep}
                disabled={isPublishing || isOptimizing}
                className="px-4 py-2 text-sm font-medium text-church-slate hover:text-church-navy"
              >
                ← Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {activeStep !== 'Review' ? (
              <button 
                type="button" 
                onClick={nextStep}
                disabled={loading || isOptimizing || (activeStep === 'Optimize' && !optimizedFile)}
                className="px-6 py-2 bg-church-navy text-white rounded-full text-sm font-medium hover:bg-church-navy/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : isEditMode ? (
              // Edit mode buttons
              <>
                <button 
                  onClick={() => handleSaveDetails('draft')}
                  disabled={isPublishing}
                  className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button 
                  onClick={() => handleSaveDetails('published')}
                  disabled={isPublishing}
                  className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold shadow-md hover:bg-church-green/90 disabled:opacity-50"
                >
                  {isPublishing ? 'Saving...' : 'Save & Publish'}
                </button>
              </>
            ) : (
              // New upload buttons
              <>
                <button 
                  onClick={() => handlePublish('draft')}
                  disabled={isPublishing || uploadStatus === 'processing'}
                  className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button 
                  onClick={() => handlePublish('published')}
                  disabled={isPublishing || uploadStatus === 'processing'}
                  className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold shadow-md hover:bg-church-green/90 disabled:opacity-50"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Sermon'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
