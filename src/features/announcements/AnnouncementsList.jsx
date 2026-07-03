import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Megaphone, Plus, MoreVertical, Edit, Trash2, Clock, Calendar, CheckCircle, Smartphone } from 'lucide-react';
import AnnouncementFormModal from './AnnouncementFormModal';

export default function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('Active'); // Active, Scheduled, Drafts, Expired
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnnouncements(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        console.error(err);
        alert("Failed to delete announcement.");
      }
    }
  };

  const openEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingAnnouncement(null);
    setIsModalOpen(true);
  };

  // Filter logic based on timestamps and status
  const now = new Date();
  
  const filteredAnnouncements = announcements.filter(a => {
    if (a.status === 'Draft') return activeTab === 'Drafts';
    
    const publishDate = a.publishDate ? new Date(a.publishDate) : new Date(0);
    const expiryDate = a.expiryDate ? new Date(a.expiryDate) : new Date(8640000000000000); // Max date if no expiry
    
    const isScheduled = publishDate > now;
    const isExpired = expiryDate < now;
    const isActive = publishDate <= now && expiryDate >= now;

    if (activeTab === 'Scheduled') return isScheduled;
    if (activeTab === 'Expired') return isExpired;
    if (activeTab === 'Active') return isActive;
    
    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Announcements</h1>
          <p className="text-sm text-church-slate mt-1">Broadcast updates and manage notifications for the church.</p>
        </div>
        <button 
          onClick={openCreate}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Create Post
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-6 pt-4 space-x-6">
          {['Active', 'Scheduled', 'Drafts', 'Expired'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-church-green text-church-green' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-church-green/10' : 'bg-gray-100'}`}>
                {/* Count for this tab (simplified for UI) */}
                {tab === 'Active' ? announcements.filter(a => a.status === 'Published' && (!a.publishDate || new Date(a.publishDate) <= now) && (!a.expiryDate || new Date(a.expiryDate) >= now)).length :
                 tab === 'Scheduled' ? announcements.filter(a => a.status === 'Published' && a.publishDate && new Date(a.publishDate) > now).length :
                 tab === 'Drafts' ? announcements.filter(a => a.status === 'Draft').length :
                 announcements.filter(a => a.status === 'Published' && a.expiryDate && new Date(a.expiryDate) < now).length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 bg-gray-50/30">
          {loading ? (
            <div className="text-center text-church-slate py-12">Loading announcements...</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center text-gray-300 mb-4"><Megaphone size={40} /></div>
              <p className="text-church-navy font-bold text-lg">No {activeTab.toLowerCase()} announcements</p>
              <p className="text-church-slate text-sm">Create a new post to engage with your congregation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnnouncements.map(post => (
                <div key={post.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col relative group">
                  
                  {/* Action Menu */}
                  <div className="absolute top-4 right-4 z-10">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)}
                      className="text-gray-400 hover:text-church-navy p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeMenuId === post.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                          <button 
                            onClick={() => { setActiveMenuId(null); openEdit(post); }}
                            className="w-full flex items-center px-4 py-2 text-sm font-medium text-church-navy hover:bg-gray-50"
                          >
                            <Edit size={16} className="mr-2" /> Edit
                          </button>
                          <button 
                            onClick={() => { setActiveMenuId(null); handleDelete(post.id); }}
                            className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} className="mr-2" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4 pr-8">
                    {post.pushNotification && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                        <Smartphone size={12} className="mr-1" /> Push Sent
                      </span>
                    )}
                    {post.targetAudience?.map(aud => (
                      <span key={aud} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
                        {aud}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-church-navy mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-church-slate line-clamp-3 mb-6 flex-1">{post.message}</p>

                  <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-2">
                    {post.publishDate && (
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-2" /> 
                        {activeTab === 'Scheduled' ? 'Publishes: ' : 'Published: '}
                        {new Date(post.publishDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                    {post.expiryDate && (
                      <div className="flex items-center">
                        <Clock size={14} className="mr-2" /> 
                        Expires: {new Date(post.expiryDate).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnnouncementFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        announcement={editingAnnouncement}
      />
    </div>
  );
}
