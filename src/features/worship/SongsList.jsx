import React, { useState, useEffect } from 'react';
import { Plus, Music, Edit, Trash2, Search, Filter, Upload, Settings, Eye, EyeOff, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSongs, deleteSong, updateSong } from './worshipService';
import { useAuth } from '../../context/AuthContext';
import { canManageSongDirectorySettings, canEditSong, canViewSongLibrary } from '../../utils/songDirectoryPermissions';
import SongFormModal from './SongFormModal';
import ModernDropdown from '../../components/ui/ModernDropdown';

export default function SongsList() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directoryVisibilityFilter, setDirectoryVisibilityFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  if (!canViewSongLibrary(userProfile)) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-church-navy">Access Denied</h2>
        <p className="text-church-slate mt-2">You do not have permission to access the Song Library.</p>
      </div>
    );
  }

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

  // Quick Action Handlers
  const handleToggleDirectoryVisibility = async (song, newVisibility) => {
    if (!canManageSongDirectorySettings(userProfile, song)) return;
    try {
      await updateSong(song.id, { directoryVisibility: newVisibility });
      fetchSongs();
    } catch (err) {
      console.error(err);
      alert('Failed to update directory visibility');
    }
  };

  const handleToggleLyricsInDirectory = async (song, allowLyrics) => {
    if (!canManageSongDirectorySettings(userProfile, song)) return;
    try {
      await updateSong(song.id, { 
        allowLyricsInDirectory: allowLyrics,
        allowPublicLyrics: allowLyrics
      });
      fetchSongs();
    } catch (err) {
      console.error(err);
      alert('Failed to update lyrics setting');
    }
  };

  const filteredSongs = songs.filter(s => {
    const matchesSearch = 
      !searchQuery ||
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' || (s.status || 'active') === statusFilter;

    const matchesVisibility = 
      directoryVisibilityFilter === 'all' || (s.directoryVisibility || 'hidden') === directoryVisibilityFilter;

    const matchesLanguage = 
      languageFilter === 'all' || (s.language || 'english') === languageFilter;

    const matchesCategory = 
      categoryFilter === 'all' || (s.category || 'contemporary') === categoryFilter;

    return matchesSearch && matchesStatus && matchesVisibility && matchesLanguage && matchesCategory;
  });

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Songs & Lyrics</h1>
          <p className="text-sm text-church-slate mt-1">Manage worship songs, arrangements, and mobile directory visibility.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => navigate('/admin/worship/songs/import/settings')}
            className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-church-navy rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
            title="Import Settings"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={() => navigate('/admin/worship/songs/import')}
            className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-church-navy rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload size={18} className="mr-2" />
            Import PDF
          </button>
          <button 
            onClick={handleAddClick}
            className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
          >
            <Plus size={18} className="mr-2" />
            Add Song
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search songs, artists, or tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green text-sm"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
            <ModernDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' }
              ]}
            />
            <ModernDropdown
              value={directoryVisibilityFilter}
              onChange={setDirectoryVisibilityFilter}
              options={[
                { value: 'all', label: 'All Visibilities' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'members_only', label: 'Members Only' },
                { value: 'public', label: 'Public' }
              ]}
            />
            <ModernDropdown
              value={languageFilter}
              onChange={setLanguageFilter}
              options={[
                { value: 'all', label: 'All Languages' },
                { value: 'english', label: 'English' },
                { value: 'tagalog', label: 'Tagalog' },
                { value: 'ilocano', label: 'Ilocano' },
                { value: 'other', label: 'Other' }
              ]}
            />
            <ModernDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'All Categories' },
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
          <p className="text-church-slate text-center max-w-sm mb-6">Build your library to easily create setlists for your worship services and publish to the mobile community directory.</p>
          <button 
            onClick={handleAddClick}
            className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Add First Song
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-church-soft border border-gray-100 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Title / Artist</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Language</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Directory Visibility</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Lyrics in Directory</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSongs.map((song) => {
                const canManageDir = canManageSongDirectorySettings(userProfile, song);
                const canEdit = canEditSong(userProfile, song);

                return (
                  <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                          <Music size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="font-semibold text-church-navy">{song.title}</div>
                          <div className="text-xs text-gray-500">{song.artist || song.artistName || song.bandName || song.composer || 'Unknown Artist'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Language */}
                    <td className="px-4 py-4 whitespace-nowrap capitalize text-gray-700">
                      {song.language || 'English'}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 whitespace-nowrap capitalize text-gray-700">
                      {song.category || 'Contemporary'}
                    </td>

                    {/* Directory Visibility */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                        song.directoryVisibility === 'public' ? 'bg-purple-100 text-purple-800' :
                        song.directoryVisibility === 'members_only' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {song.directoryVisibility === 'public' ? 'Public' :
                         song.directoryVisibility === 'members_only' ? 'Members Only' : 'Hidden'}
                      </span>
                    </td>

                    {/* Lyrics in Directory */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {song.allowLyricsInDirectory || song.allowPublicLyrics ? (
                        <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md font-medium">
                          <CheckCircle size={14} className="mr-1" /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md font-medium">
                          <XCircle size={14} className="mr-1" /> Disabled
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                        song.status === 'active' ? 'bg-green-100 text-green-800' : 
                        song.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {song.status === 'active' ? 'Active' : 
                         song.status === 'draft' ? 'Draft' : 'Archived'}
                      </span>
                    </td>

                    {/* Actions & Quick Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      {canManageDir && (
                        <>
                          {song.directoryVisibility === 'hidden' ? (
                            <button 
                              onClick={() => handleToggleDirectoryVisibility(song, 'members_only')}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md"
                              title="Show in Directory (Members Only)"
                            >
                              Show
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleDirectoryVisibility(song, 'hidden')}
                              className="text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded-md"
                              title="Hide from Directory"
                            >
                              Hide
                            </button>
                          )}

                          {song.allowLyricsInDirectory || song.allowPublicLyrics ? (
                            <button 
                              onClick={() => handleToggleLyricsInDirectory(song, false)}
                              className="text-amber-600 hover:text-amber-900 bg-amber-50 px-2 py-1 rounded-md"
                              title="Disable Lyrics in Directory"
                            >
                              No Lyrics
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleLyricsInDirectory(song, true)}
                              className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded-md"
                              title="Enable Lyrics in Directory"
                            >
                              Lyrics
                            </button>
                          )}
                        </>
                      )}

                      {canEdit && (
                        <button onClick={() => handleEditClick(song)} className="text-blue-600 hover:text-blue-900 ml-2">
                          Edit
                        </button>
                      )}
                      
                      {canEdit && (
                        <button onClick={() => handleDeleteClick(song.id, song.title)} className="text-red-600 hover:text-red-900 ml-2">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
