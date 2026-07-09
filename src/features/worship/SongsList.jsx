import React, { useState, useEffect } from 'react';
import { Plus, Music, Edit, Trash2, Search, Filter } from 'lucide-react';
import { getSongs, deleteSong } from './worshipService';
import { useAuth } from '../../context/AuthContext';
import SongFormModal from './SongFormModal';

export default function SongsList() {
  const { userProfile } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSongs = async () => {
    if (!userProfile?.churchId) return;
    setLoading(true);
    try {
      const data = await getSongs(userProfile.churchId);
      setSongs(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSongs();
  }, [userProfile?.churchId]);

  const handleAddClick = () => {
    setEditingSong(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (song) => {
    setEditingSong(song);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete the song "${title}"?`)) {
      await deleteSong(id);
      fetchSongs();
    }
  };

  const filteredSongs = songs.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Songs & Lyrics</h1>
          <p className="text-sm text-church-slate mt-1">Manage worship songs, lyrics, and arrangements.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Add Song
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search songs, artists, or tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green"
          />
        </div>
        <button className="ml-4 p-2 text-gray-500 hover:text-church-navy hover:bg-gray-50 rounded-xl transition-colors">
          <Filter size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading songs...</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <Music size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No songs found</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">Build your library to easily create setlists for your worship services.</p>
          <button 
            onClick={handleAddClick}
            className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Add First Song
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-church-soft border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Artist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSongs.map((song) => (
                <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                        <Music size={20} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-church-navy">{song.title}</div>
                        <div className="text-sm text-gray-500">{song.artist || 'Unknown Artist'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">{song.defaultKey || '-'}</div>
                    <div className="text-xs text-gray-500">{song.tempoBpm ? `${song.tempoBpm} BPM` : ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {song.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                      {song.tags?.length > 3 && <span className="text-xs text-gray-500">+{song.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${song.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {song.status === 'active' ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEditClick(song)} className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteClick(song.id, song.title)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <SongFormModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          song={editingSong}
          onSaved={fetchSongs}
        />
      )}
    </div>
  );
}
