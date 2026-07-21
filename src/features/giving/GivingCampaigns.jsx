import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Search, Play, Pause, CheckCircle, Archive, AlertCircle } from 'lucide-react';
import CampaignFormModal from './CampaignFormModal';

export default function GivingCampaigns() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [fundsMap, setFundsMap] = useState({});

  useEffect(() => {
    if (!CHURCH_ID) return;
    const q = query(
      collection(db, 'givingCampaigns'),
      where('churchId', '==', CHURCH_ID)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setCampaigns(docs);
      setCampaigns(docs);
      setLoading(false);
    });

    const fetchFunds = async () => {
      try {
        const qFunds = query(collection(db, 'givingFunds'), where('churchId', '==', CHURCH_ID));
        const unsubscribeFunds = onSnapshot(qFunds, (snap) => {
          const map = {};
          snap.forEach(d => {
            map[d.id] = d.data().name;
          });
          setFundsMap(map);
        });
        return unsubscribeFunds;
      } catch (err) {
        console.error("Error fetching funds:", err);
      }
    };
    
    let unsubscribeFunds;
    fetchFunds().then(unsub => unsubscribeFunds = unsub);

    return () => {
      unsubscribe();
      if (unsubscribeFunds) unsubscribeFunds();
    };
  }, [CHURCH_ID]);

  const handleAddClick = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (campaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredCampaigns = campaigns.filter(c => 
    c.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'paused':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">Paused</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">Completed</span>;
      case 'archived':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">Archived</span>;
      case 'draft':
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">Draft</span>;
    }
  };

  const handleUpdateStatus = (campaign, action) => {
    setEditingCampaign({ ...campaign, _action: action });
    setIsModalOpen(true);
  };

  const getFundName = (fundId, fundType) => {
    if (fundId && fundsMap[fundId]) return fundsMap[fundId];
    if (fundType) return fundType;
    return 'None';
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Giving Campaigns</h1>
          <p className="text-sm text-church-slate mt-1">Manage fundraising and special projects.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Create Campaign
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-church-navy">Campaigns</h2>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent text-sm transition-shadow"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-church-bg/50 text-church-slate text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold rounded-tl-3xl">Campaign</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Goal</th>
                <th className="px-6 py-4 font-semibold">Raised</th>
                <th className="px-6 py-4 font-semibold rounded-tr-3xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-church-slate">
                    Loading campaigns...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                    <AlertCircle size={32} className="mb-3 text-gray-300" />
                    <p>No campaigns found.</p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-church-navy">{campaign.title}</div>
                      <div className="text-xs text-church-slate mt-0.5 truncate max-w-xs">{campaign.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {campaign.campaignType?.replace('_', ' ')}
                      </span>
                      {campaign.fundId && (
                        <div className="mt-2 text-xs text-church-slate flex items-center">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">Fund: {getFundName(campaign.fundId, campaign.fundType)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-church-navy">
                      {formatCurrency(campaign.goalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-church-green">
                      {formatCurrency(campaign.raisedAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleEditClick(campaign)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View / Edit"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {campaign.status === 'draft' && (
                          <button onClick={() => handleUpdateStatus(campaign, 'activate')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activate">
                            <Play size={16} />
                          </button>
                        )}
                        {campaign.status === 'active' && (
                          <>
                            <button onClick={() => handleUpdateStatus(campaign, 'pause')} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Pause">
                              <Pause size={16} />
                            </button>
                            <button onClick={() => handleUpdateStatus(campaign, 'complete')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mark Completed">
                              <CheckCircle size={16} />
                            </button>
                          </>
                        )}
                        {campaign.status === 'paused' && (
                          <button onClick={() => handleUpdateStatus(campaign, 'resume')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Resume">
                            <Play size={16} />
                          </button>
                        )}
                        {['draft', 'paused', 'completed'].includes(campaign.status) && (
                          <button onClick={() => handleUpdateStatus(campaign, 'archive')} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" title="Archive">
                            <Archive size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CampaignFormModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          campaign={editingCampaign}
        />
      )}
    </div>
  );
}
