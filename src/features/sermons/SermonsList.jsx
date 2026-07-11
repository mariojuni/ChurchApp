import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, BookOpen, Edit, Trash2, Calendar, User, Video, Headphones, FileText, MoreVertical, Globe, Lock } from 'lucide-react';
import SermonFormModal from './SermonFormModal';

export default function SermonsList() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV'; // Fallback
  
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState(null);
  
  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    // Query from top-level 'sermons' collection matching firestore.rules
    const q = query(
      collection(db, 'sermons'), 
      where('churchId', '==', CHURCH_ID),
      orderBy('preachedDate', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSermons(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sermons:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddClick = () => {
    setEditingSermon(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (sermon) => {
    setEditingSermon(sermon);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = async (id, title) => {
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to delete the sermon "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'sermons', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete sermon.");
      }
    }
  };

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateObj = new Date(dateStr + 'T00:00:00'); 
    return dateObj.toLocaleDateString(undefined, options);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">Published</span>;
      case 'draft':
        return <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">Draft</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">Failed</span>;
      default:
        return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Sermons</h1>
          <p className="text-sm text-church-slate mt-1">Manage sermon uploads, media files, and publish status.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Create Sermon
        </button>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading sermons...</p>
        </div>
      ) : sermons.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No sermons yet</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">Build your content library by uploading your first sermon audio or video.</p>
          <button 
            onClick={handleAddClick}
            className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Create Sermon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sermons.map(sermon => (
            <div key={sermon.id} className="bg-white rounded-3xl overflow-hidden shadow-church-soft border border-gray-100 flex flex-col relative group transition-all hover:shadow-md">
              
              {/* Thumbnail / Header Area */}
              <div 
                className="h-40 bg-gray-100 relative border-b border-gray-200 flex items-center justify-center bg-cover bg-center"
                style={sermon.thumbnailUrl ? { backgroundImage: `url(${sermon.thumbnailUrl})` } : {}}
              >
                {/* Fallback Icon if no thumbnail */}
                {!sermon.thumbnailUrl && (
                  <BookOpen size={48} className="text-gray-300" />
                )}
                
                {/* Gradient Overlay for text readability if thumbnail exists */}
                {sermon.thumbnailUrl && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                )}

                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex space-x-2">
                  {renderStatusBadge(sermon.status)}
                  {sermon.visibility === 'public' ? (
                    <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center"><Globe size={10} className="mr-1" /> Public</span>
                  ) : (
                    <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center"><Lock size={10} className="mr-1" /> {sermon.visibility}</span>
                  )}
                </div>
                
                {/* Actions Dropdown */}
                <div className="absolute top-4 right-4 relative">
                  <button 
                    onClick={() => toggleMenu(sermon.id)}
                    className="p-2 text-gray-500 hover:text-church-navy bg-white/80 hover:bg-white rounded-full transition-colors backdrop-blur-sm shadow-sm"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {activeMenuId === sermon.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                        <button 
                          onClick={() => handleEditClick(sermon)}
                          className="w-full flex items-center px-4 py-2 text-sm text-church-navy hover:bg-gray-50"
                        >
                          <Edit size={14} className="mr-2" /> Edit Details
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(sermon.id, sermon.title)}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Media Icons Over Thumbnail */}
                <div className="absolute bottom-3 left-4 flex space-x-2">
                  {sermon.audioUrl && <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white"><Headphones size={14} /></div>}
                  {sermon.videoUrl && <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white"><Video size={14} /></div>}
                  {sermon.notesUrl && <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white"><FileText size={14} /></div>}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-xs font-semibold text-church-green uppercase tracking-wider">
                    <Calendar size={14} className="mr-1.5" />
                    {formatDate(sermon.preachedDate)}
                  </div>
                  <div className="text-xs text-church-slate font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                    {sermon.category || 'Sunday Worship'}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-church-navy mb-1 line-clamp-2 leading-tight">{sermon.title}</h3>
                
                <div className="flex items-center text-sm font-medium text-church-slate mb-3">
                  <User size={14} className="mr-1.5" />
                  {sermon.speakerName}
                </div>
                
                {sermon.passage && (
                  <div className="inline-flex items-center self-start px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 mb-3">
                    <BookOpen size={12} className="mr-1.5" />
                    {sermon.passage}
                  </div>
                )}
                
                {sermon.seriesId && (
                  <p className="text-xs font-medium text-church-slate uppercase tracking-wider mb-2">
                    Series: {sermon.seriesId}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SermonFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sermon={editingSermon}
      />
    </div>
  );
}
