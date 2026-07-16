import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Save, Upload, MapPin, Phone, Mail, Clock, Plus, Trash2, Globe } from 'lucide-react';
import ModernDropdown from '../../components/ui/ModernDropdown';

const CHURCH_ID = 'YmEc6C69Xz4DKRQaQZBV';

export default function SettingsProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [logoFile, setLogoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    churchName: '',
    logoUrl: '',
    theme: {
      primaryColor: '#1C5D42'
    },
    address: '',
    contact: {
      phone: '',
      email: ''
    },
    social: {
      facebook: '',
      instagram: '',
      website: ''
    },
    serviceSchedules: []
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'churches', CHURCH_ID, 'settings', 'profile');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            churchName: data.churchName || '',
            logoUrl: data.logoUrl || '',
            theme: { primaryColor: data.theme?.primaryColor || '#1C5D42' },
            address: data.address || '',
            contact: {
              phone: data.contact?.phone || '',
              email: data.contact?.email || ''
            },
            social: {
              facebook: data.social?.facebook || '',
              instagram: data.social?.instagram || '',
              website: data.social?.website || ''
            },
            serviceSchedules: data.serviceSchedules || []
          });
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e, section = null) => {
    const { name, value } = e.target;
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const addService = () => {
    setFormData(prev => ({
      ...prev,
      serviceSchedules: [...prev.serviceSchedules, { day: 'Sunday', time: '09:00 AM', name: 'Worship Service' }]
    }));
  };

  const updateService = (index, field, value) => {
    const updated = [...formData.serviceSchedules];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, serviceSchedules: updated }));
  };

  const removeService = (index) => {
    const updated = formData.serviceSchedules.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, serviceSchedules: updated }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      let finalLogoUrl = formData.logoUrl;

      // Handle Logo Upload
      if (logoFile) {
        const storageRef = ref(storage, `brand/${CHURCH_ID}/logo_${Date.now()}_${logoFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, logoFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (err) => reject(err),
            async () => {
              finalLogoUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const settingsData = {
        ...formData,
        logoUrl: finalLogoUrl,
        updatedAt: serverTimestamp()
      };

      const docRef = doc(db, 'churches', CHURCH_ID, 'settings', 'profile');
      await setDoc(docRef, settingsData, { merge: true });

      // Update local state if URL changed
      if (finalLogoUrl !== formData.logoUrl) {
        setFormData(prev => ({ ...prev, logoUrl: finalLogoUrl }));
        setLogoFile(null); // clear file input state
      }

      setMessage({ text: 'Settings saved successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to save settings. Try again.', type: 'error' });
    } finally {
      setSaving(false);
      setUploadProgress(0);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full text-church-slate">Loading Settings...</div>;
  }

  return (
    <div className="space-y-6 flex flex-col h-full max-w-4xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">Church Profile</h1>
          <p className="text-sm text-church-slate">Manage your church's global identity and settings.</p>
        </div>
        <div className="flex items-center space-x-4">
          {message.text && (
            <span className={`text-sm font-bold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold hover:bg-church-green/90 transition-opacity disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Brand */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100">
            <h2 className="text-lg font-bold text-church-navy mb-4">Brand Identity</h2>
            
            <div className="space-y-4">
              {/* Logo Preview */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 relative group">
                {logoFile ? (
                  <img src={URL.createObjectURL(logoFile)} alt="Preview" className="h-24 w-auto object-contain" />
                ) : formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="h-24 w-auto object-contain" />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                    <Globe size={32} />
                  </div>
                )}
                
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  <Upload size={24} className="text-white mb-2" />
                  <span className="text-white text-xs font-bold">Upload New</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className="bg-church-green h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Church Name</label>
                <input 
                  type="text" 
                  name="churchName"
                  value={formData.churchName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Primary Brand Color</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="color" 
                    name="primaryColor"
                    value={formData.theme.primaryColor}
                    onChange={(e) => handleChange(e, 'theme')}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0" 
                  />
                  <input 
                    type="text" 
                    name="primaryColor"
                    value={formData.theme.primaryColor}
                    onChange={(e) => handleChange(e, 'theme')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none uppercase text-sm font-mono" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Contact Info */}
          <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100">
            <h2 className="text-lg font-bold text-church-navy mb-4">Contact & Location</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1 flex items-center">
                  <MapPin size={14} className="mr-1 text-gray-400"/> Address
                </label>
                <textarea 
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1 flex items-center">
                    <Phone size={14} className="mr-1 text-gray-400"/> Phone Number
                  </label>
                  <input 
                    type="text" 
                    name="phone"
                    value={formData.contact.phone}
                    onChange={(e) => handleChange(e, 'contact')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1 flex items-center">
                    <Mail size={14} className="mr-1 text-gray-400"/> Email Address
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.contact.email}
                    onChange={(e) => handleChange(e, 'contact')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1 flex items-center">
                    <Globe size={14} className="mr-1 text-gray-400"/> Facebook URL
                  </label>
                  <input 
                    type="text" 
                    name="facebook"
                    placeholder="https://facebook.com/..."
                    value={formData.social.facebook}
                    onChange={(e) => handleChange(e, 'social')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1 flex items-center">
                    <Globe size={14} className="mr-1 text-gray-400"/> Instagram URL
                  </label>
                  <input 
                    type="text" 
                    name="instagram"
                    placeholder="https://instagram.com/..."
                    value={formData.social.instagram}
                    onChange={(e) => handleChange(e, 'social')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:outline-none text-sm" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Service Schedules */}
          <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-church-navy">Service Schedules</h2>
              <button 
                onClick={addService}
                className="flex items-center text-xs font-bold text-church-green bg-church-green/10 px-3 py-1.5 rounded-lg hover:bg-church-green/20 transition-colors"
              >
                <Plus size={14} className="mr-1" /> Add Service
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.serviceSchedules.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                  No service schedules configured.
                </div>
              ) : (
                formData.serviceSchedules.map((service, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                      <Clock size={18} />
                    </div>
                    
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div className="w-full">
                        <ModernDropdown
                          value={service.day}
                          onChange={(val) => updateService(index, 'day', val)}
                          options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => ({ value: d, label: d }))}
                        />
                      </div>
                      
                      <input 
                        type="text" 
                        placeholder="Time (e.g. 9:00 AM)"
                        value={service.time}
                        onChange={(e) => updateService(index, 'time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      />
                      
                      <input 
                        type="text" 
                        placeholder="Service Name"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      />
                    </div>
                    
                    <button 
                      onClick={() => removeService(index)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
