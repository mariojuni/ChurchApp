import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Music, Trash2, GripVertical, AlertCircle, ListMusic } from 'lucide-react';
import { getSetlist, getSetlistItems, getSongs, createSetlistItem, deleteSetlistItem } from './worshipService';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import ModernDropdown from '../../components/ui/ModernDropdown';

export default function SetlistDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [setlist, setSetlist] = useState(null);
  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [availableSongs, setAvailableSongs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [addingSong, setAddingSong] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');

  const fetchDetails = async () => {
    if (!userProfile?.churchId || !id) return;
    setLoading(true);
    try {
      const data = await getSetlist(id);
      if (data) {
        setSetlist(data);
        if (data.eventId) {
          const eventDoc = await getDoc(doc(db, 'events', data.eventId));
          if (eventDoc.exists()) setEvent(eventDoc.data());
        }
      }
      
      const itemsData = await getSetlistItems(id);
      setItems(itemsData);
      
      const songsData = await getSongs(userProfile.churchId);
      setAvailableSongs(songsData.filter(s => s.status === 'active'));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [id, userProfile?.churchId]);

  const handleAddSong = async () => {
    if (!selectedSongId) return;
    
    const song = availableSongs.find(s => s.id === selectedSongId);
    if (!song) return;

    setAddingSong(true);
    try {
      const newItem = {
        churchId: userProfile.churchId,
        setlistId: id,
        songId: song.id,
        order: items.length, // simple ordering
        selectedKey: song.defaultKey || '',
        tempoBpm: song.tempoBpm || null,
        title: song.title // Denormalize title for easy display
      };
      
      await createSetlistItem(newItem);
      setSelectedSongId('');
      fetchDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to add song to setlist');
    }
    setAddingSong(false);
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Remove this song from the setlist?')) {
      await deleteSetlistItem(itemId);
      fetchDetails();
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p>Loading setlist details...</p></div>;
  }

  if (!setlist) {
    return <div className="flex-1 flex items-center justify-center"><p>Setlist not found.</p></div>;
  }

  return (
    <div className="space-y-6 flex flex-col h-full max-w-5xl mx-auto">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/admin/worship/setlists')}
          className="p-2 text-gray-400 hover:text-church-navy bg-white rounded-full shadow-sm border border-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-church-navy">{setlist.title}</h1>
          <p className="text-sm text-church-slate mt-1 flex items-center">
            {event ? `${event.title} • ` : ''} 
            {setlist.serviceDate ? new Date(setlist.serviceDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date'}
          </p>
        </div>
        <div className="ml-auto flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            setlist.status === 'published' ? 'bg-green-100 text-green-700' :
            setlist.status === 'archived' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {setlist.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-church-soft border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-church-navy flex items-center">
                <Music size={18} className="mr-2 text-church-green" />
                Setlist Order
              </h2>
            </div>
            
            {items.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <ListMusic size={24} />
                </div>
                <h3 className="text-lg font-bold text-church-navy mb-1">Empty Setlist</h3>
                <p className="text-church-slate text-sm">Add songs from your library using the panel on the right.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.sort((a, b) => a.order - b.order).map((item, index) => (
                  <div key={item.id} className="flex items-center p-4 hover:bg-gray-50 transition-colors group">
                    <div className="cursor-move p-2 text-gray-300 hover:text-gray-500 mr-2">
                      <GripVertical size={16} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm mr-4">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-church-navy">{item.title || 'Unknown Song'}</h4>
                      <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
                        {item.selectedKey && <span className="font-semibold text-gray-700">Key: {item.selectedKey}</span>}
                        {item.tempoBpm && <span>{item.tempoBpm} BPM</span>}
                      </div>
                    </div>
                    <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-church-soft border border-gray-100 p-6">
            <h3 className="text-base font-bold text-church-navy mb-4">Add Song</h3>
            <div className="space-y-4">
              <div>
                <ModernDropdown
                  value={selectedSongId}
                  onChange={(val) => setSelectedSongId(val)}
                  options={[
                    { value: '', label: '-- Choose a song --' },
                    ...availableSongs.map(song => ({
                      value: song.id,
                      label: `${song.title} ${song.artist ? `(${song.artist})` : ''}`
                    }))
                  ]}
                  searchable={availableSongs.length > 10}
                />
              </div>
              <button 
                onClick={handleAddSong}
                disabled={!selectedSongId || addingSong}
                className="w-full py-2.5 bg-church-green text-white rounded-xl font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {addingSong ? 'Adding...' : <><Plus size={16} className="mr-2" /> Add to Setlist</>}
              </button>
            </div>
            
            {availableSongs.length === 0 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl flex items-start">
                <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>No active songs found in your library. Add songs first.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
