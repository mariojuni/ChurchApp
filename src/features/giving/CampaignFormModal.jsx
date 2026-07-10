import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { X, Save, Play, Pause, CheckCircle, Archive, AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function CampaignFormModal({ isOpen, onClose, campaign }) {
  const { userProfile, originalUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalAmount: '',
    campaignType: 'building_project',
    allowPublicProgress: true,
    allowPublicExpenses: false,
    coverImageUrl: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pauseReason, setPauseReason] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mode determines what we are doing: edit, activate, pause, complete, archive
  const mode = campaign?._action || (campaign ? 'edit' : 'create');

  useEffect(() => {
    if (campaign) {
      setFormData({
        title: campaign.title || '',
        description: campaign.description || '',
        goalAmount: campaign.goalAmount || '',
        campaignType: campaign.campaignType || 'building_project',
        allowPublicProgress: campaign.allowPublicProgress ?? true,
        allowPublicExpenses: campaign.allowPublicExpenses ?? false,
        coverImageUrl: campaign.coverImageUrl || '',
      });
      setCoverImageFile(null);
      setUploadProgress(0);
    }
  }, [campaign]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob failed'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.6 // Aggressive compression quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e) => {
    if (e.target.files[0]) {
      const originalFile = e.target.files[0];
      if (originalFile.type.startsWith('image/')) {
        try {
          const compressedFile = await compressImage(originalFile);
          setCoverImageFile(compressedFile);
        } catch (err) {
          console.error("Failed to compress image, using original:", err);
          setCoverImageFile(originalFile);
        }
      } else {
        setCoverImageFile(originalFile);
      }
    }
  };

  const handleRemoveImage = async () => {
    if (formData.coverImageUrl) {
      try {
        const imageRef = ref(storage, formData.coverImageUrl);
        await deleteObject(imageRef);
      } catch (err) {
        console.error("Error deleting image from storage:", err);
      }
    }
    setCoverImageFile(null);
    setFormData(prev => ({ ...prev, coverImageUrl: '' }));
  };

  const validateActivation = async () => {
    if (!formData.title?.trim()) return "Title is required.";
    if (!formData.description?.trim()) return "Description is required.";
    if (!formData.goalAmount || Number(formData.goalAmount) <= 0) return "Goal amount must be greater than 0.";
    if (!formData.campaignType) return "Campaign type is required.";
    if (campaign?.status === 'archived') return "Cannot activate an archived campaign.";
    if (campaign?.churchId !== userProfile.churchId) return "Invalid church context.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageUrl = formData.coverImageUrl;
      if (coverImageFile) {
        const storageRef = ref(storage, `images/campaign/${userProfile.churchId}/${Date.now()}_${coverImageFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, coverImageFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (err) => reject(err),
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      if (mode === 'create') {
        const campaignRef = doc(collection(db, 'givingCampaigns'));
        await setDoc(campaignRef, {
          ...formData,
          coverImageUrl: imageUrl,
          goalAmount: Number(formData.goalAmount),
          churchId: userProfile.churchId,
          status: 'draft',
          raisedAmount: 0,
          expenseAmount: 0,
          createdBy: originalUserProfile.name || 'Unknown',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (mode === 'edit') {
        const campaignRef = doc(db, 'givingCampaigns', campaign.id);
        await updateDoc(campaignRef, {
          ...formData,
          coverImageUrl: imageUrl,
          goalAmount: Number(formData.goalAmount),
          updatedBy: originalUserProfile.name || 'Unknown',
          updatedAt: serverTimestamp(),
        });
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save campaign. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (targetStatus) => {
    setLoading(true);
    setError(null);

    try {
      if (targetStatus === 'active') {
        const validationError = await validateActivation();
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }
      }

      const campaignRef = doc(db, 'givingCampaigns', campaign.id);
      const updateData = {
        status: targetStatus,
        updatedBy: originalUserProfile.name || 'Unknown',
        updatedAt: serverTimestamp(),
      };

      if (targetStatus === 'active') {
        updateData.activatedAt = serverTimestamp();
        updateData.activatedBy = originalUserProfile.name || 'Unknown';
      } else if (targetStatus === 'paused') {
        updateData.pausedAt = serverTimestamp();
        updateData.pausedBy = originalUserProfile.name || 'Unknown';
        updateData.pauseReason = pauseReason;
      } else if (targetStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
        updateData.completedBy = originalUserProfile.name || 'Unknown';
      } else if (targetStatus === 'archived') {
        updateData.archivedAt = serverTimestamp();
        updateData.archivedBy = originalUserProfile.name || 'Unknown';
      }

      await updateDoc(campaignRef, updateData);
      
      // Also save any form edits if we are activating from draft
      if (targetStatus === 'active' && campaign.status === 'draft') {
        await updateDoc(campaignRef, {
          title: formData.title,
          description: formData.description,
          goalAmount: Number(formData.goalAmount),
          campaignType: formData.campaignType,
          allowPublicProgress: formData.allowPublicProgress,
          allowPublicExpenses: formData.allowPublicExpenses,
          coverImageUrl: formData.coverImageUrl,
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update campaign status. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (mode === 'pause') {
      return (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg flex items-start">
            <Pause className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-yellow-900">Pause Campaign?</h3>
              <p className="text-yellow-800 text-sm mt-1">
                Pausing this campaign will hide it from the mobile app. Members will not be able to give to it until it is resumed.
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-xs font-semibold text-church-slate mb-1">Reason for pausing (Optional)</label>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green min-h-[100px]"
              placeholder="e.g. Temporarily halted while we review funds."
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-church-slate font-semibold hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction('paused')}
              disabled={loading}
              className="px-5 py-2.5 bg-yellow-500 text-white font-bold rounded-xl shadow-md hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? 'Pausing...' : 'Pause Campaign'}
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'resume') {
      return (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg flex items-start">
            <Play className="text-green-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-green-900">Resume Campaign?</h3>
              <p className="text-green-800 text-sm mt-1">
                This will reactivate the campaign and allow members to continue giving.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-church-slate font-semibold hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction('active')}
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Resuming...' : 'Resume Campaign'}
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'complete') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg flex items-start">
            <CheckCircle className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-blue-900">Mark as Completed?</h3>
              <p className="text-blue-800 text-sm mt-1">
                Marking this campaign as completed means you have reached your goal or ended the project. Members can no longer give to it.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-church-slate font-semibold hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction('completed')}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Mark Completed'}
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'archive') {
      return (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg flex items-start">
            <Archive className="text-gray-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-gray-900">Archive Campaign?</h3>
              <p className="text-gray-800 text-sm mt-1">
                Archiving will hide this campaign from all active views. It will not be accessible to members.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-church-slate font-semibold hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction('archived')}
              disabled={loading}
              className="px-5 py-2.5 bg-gray-800 text-white font-bold rounded-xl shadow-md hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? 'Archiving...' : 'Archive Campaign'}
            </button>
          </div>
        </div>
      );
    }

    // Default Edit / Create / Activate mode
    return (
      <form onSubmit={(e) => {
        // If the form is submitted via the default submit button (Save), handle it.
        // The Activate button will be a button type="button" that calls handleAction('active')
        if (mode === 'activate') {
          e.preventDefault();
          handleAction('active');
        } else {
          handleSubmit(e);
        }
      }} className="space-y-4">
        {mode === 'activate' && (
          <div className="bg-green-50 p-4 rounded-lg flex items-start mb-4">
            <Play className="text-green-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-green-900">Activate Campaign?</h3>
              <p className="text-green-800 text-sm mt-1">
                Activating this campaign will make it visible in the mobile app, and members will be able to start giving towards it immediately. Please review the details below.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-church-slate mb-1">Campaign Title</label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green"
            placeholder="e.g., New Building Project"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-church-slate mb-1">Description</label>
          <textarea
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green min-h-[100px]"
            placeholder="Describe the purpose of this campaign..."
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-church-slate mb-2">Cover Image (Optional)</label>
          {(coverImageFile || formData.coverImageUrl) ? (
            <div className="relative group rounded-xl overflow-hidden border border-gray-200">
              <img 
                src={coverImageFile ? URL.createObjectURL(coverImageFile) : formData.coverImageUrl} 
                alt="Cover Preview" 
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium text-sm shadow flex items-center hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={16} className="mr-2" />
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <label htmlFor="cover-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImageIcon size={24} className="text-gray-400 mb-2" />
                  <p className="mb-1 text-sm text-gray-500 font-medium">Click to upload cover image</p>
                  <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                </div>
                <input id="cover-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-church-green transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-church-slate mb-1">Goal Amount (₱)</label>
            <input
              type="number"
              name="goalAmount"
              required
              min="1"
              value={formData.goalAmount}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-church-slate mb-1">Campaign Type</label>
            <select
              name="campaignType"
              required
              value={formData.campaignType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green bg-white"
            >
              <option value="building_project">Building Project</option>
              <option value="ministry_fundraising">Ministry Fundraising</option>
              <option value="missions">Missions</option>
              <option value="event">Event</option>
              <option value="special_project">Special Project</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-church-slate font-semibold hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          {mode === 'activate' ? (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-opacity disabled:opacity-50"
            >
              <Play size={18} className="mr-2" />
              {loading ? 'Activating...' : 'Activate Campaign'}
            </button>
          ) : (
            <>
              {campaign && campaign.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => handleAction('active')}
                  disabled={loading}
                  className="flex items-center px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-opacity disabled:opacity-50"
                >
                  <Play size={18} className="mr-2" />
                  {loading ? 'Activating...' : 'Activate Campaign'}
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-5 py-2.5 bg-church-green text-white font-bold rounded-xl shadow-md hover:bg-church-green/90 transition-opacity disabled:opacity-50"
              >
                <Save size={18} className="mr-2" />
                {loading ? 'Saving...' : (!campaign || campaign.status === 'draft' ? 'Save Draft' : 'Save Changes')}
              </button>
            </>
          )}
        </div>
      </form>
    );
  };

  const getTitle = () => {
    switch (mode) {
      case 'activate': return 'Activate Campaign';
      case 'pause': return 'Pause Campaign';
      case 'resume': return 'Resume Campaign';
      case 'complete': return 'Complete Campaign';
      case 'archive': return 'Archive Campaign';
      case 'edit': return 'Campaign Details';
      default: return 'Create New Campaign';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-church-navy/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-church-navy">
            {getTitle()}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-start">
              <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
