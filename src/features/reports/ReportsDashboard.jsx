import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, Calendar, Users, CreditCard, Activity } from 'lucide-react';
import { canManageGiving } from '../../utils/permissions';
import ModernDropdown from '../../components/ui/ModernDropdown';
import ModernDatePicker from '../../components/ui/ModernDatePicker';

export default function ReportsDashboard() {
  const { userProfile, activeChurchId } = useAuth();
  const CHURCH_ID = activeChurchId || userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fundsMap, setFundsMap] = useState({});
  const [fundsList, setFundsList] = useState([]);
  const [selectedGivingFund, setSelectedGivingFund] = useState('all');

  const canSeeGiving = canManageGiving(userProfile);

  useEffect(() => {
    if (!CHURCH_ID) return;
    const fetchFunds = async () => {
      try {
        const { query, onSnapshot, where, collection } = await import('firebase/firestore');
        const qFunds = query(collection(db, 'givingFunds'), where('churchId', '==', CHURCH_ID));
        onSnapshot(qFunds, (snap) => {
          const map = {};
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            map[d.id] = data.name;
            if (data.status === 'active') {
              list.push({ id: d.id, name: data.name });
            }
          });
          list.sort((a, b) => a.name.localeCompare(b.name));
          setFundsMap(map);
          setFundsList(list);
        });
      } catch (err) {
        console.error("Error fetching funds:", err);
      }
    };
    fetchFunds();
  }, [CHURCH_ID]);

  const handleExportCSV = async (reportType) => {
    setLoading(true);
    try {
      if (!CHURCH_ID) throw new Error("No church context.");
      let csvContent = "";
      
      if (reportType === 'members') {
        const snap = await getDocs(collection(db, 'users'));
        const data = snap.docs.map(d => d.data()).filter(d => d.churchId === CHURCH_ID || (!d.churchId && CHURCH_ID === 'YmEc6C69Xz4DKRQaQZBV'));
        
        csvContent = "Name,Email,Phone,Status,Role,Family Group\n";
        data.forEach(m => {
          csvContent += `"${m.name}","${m.email}","${m.phone}","${m.membershipStatus}","${m.role}","${m.familyGroup}"\n`;
        });
      }
      else if (reportType === 'giving') {
        if (!canSeeGiving) throw new Error("Unauthorized");
        const snap = await getDocs(collection(db, 'givingRecords'));
        let data = snap.docs.map(d => d.data()).filter(d => d.churchId === CHURCH_ID || (!d.churchId && CHURCH_ID === 'YmEc6C69Xz4DKRQaQZBV'));
        
        data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); // Descending by date

        if (selectedGivingFund !== 'all') {
          data = data.filter(r => {
             if (r.fundId === selectedGivingFund) return true;
             const fundName = fundsMap[selectedGivingFund];
             if (r.fundType === fundName && !r.fundId) return true;
             return false;
          });
        }
        
        csvContent = "Date,Donor,Type,Method,Amount\n";
        data.forEach(g => {
          const fundName = g.fundId && fundsMap[g.fundId] ? fundsMap[g.fundId] : (g.fundType || 'Tithe');
          csvContent += `"${g.date}","${g.donorName || 'Anonymous'}","${fundName}","${g.method || g.paymentMethod || 'Cash'}","${g.amount}"\n`;
        });
      }
      else if (reportType === 'attendance') {
        const snap = await getDocs(collection(db, 'attendance'));
        let data = snap.docs.map(d => d.data()).filter(d => d.churchId === CHURCH_ID || (!d.churchId && CHURCH_ID === 'YmEc6C69Xz4DKRQaQZBV'));
        
        data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); // Descending by date
        
        csvContent = "Date,Event Name,Present,Absent,Late,Visitors\n";
        data.forEach(a => {
          csvContent += `"${a.date}","${a.eventName}","${a.metrics?.present || 0}","${a.metrics?.absent || 0}","${a.metrics?.late || 0}","${a.metrics?.visitors || 0}"\n`;
        });
      }

      if (csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-church-navy">Reports & Analytics</h1>
        <p className="text-sm text-church-slate mt-1">Generate CSV exports and view high-level ministry metrics.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-church-slate uppercase mb-1">Preset Range</label>
          <ModernDropdown
            value={dateRange}
            onChange={(val) => setDateRange(val)}
            options={[
              { value: 'This Week', label: 'This Week' },
              { value: 'This Month', label: 'This Month' },
              { value: 'This Quarter', label: 'This Quarter' },
              { value: 'This Year', label: 'This Year' },
              { value: 'Custom', label: 'Custom' }
            ]}
          />
        </div>
        {dateRange === 'Custom' && (
          <>
            <div>
              <label className="block text-xs font-bold text-church-slate uppercase mb-1">Start Date</label>
              <ModernDatePicker 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-church-slate uppercase mb-1">End Date</label>
              <ModernDatePicker 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Members Report */}
        <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4">
              <Users size={24} />
            </div>
            <div>
              <h3 className="font-bold text-church-navy">Member Demographics</h3>
              <p className="text-xs text-church-slate">Active roster & visitors</p>
            </div>
          </div>
          <button 
            onClick={() => handleExportCSV('members')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 border-2 border-blue-100 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors"
          >
            <Download size={16} className="mr-2" /> Export CSV
          </button>
        </div>

        {/* Attendance Report */}
        <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mr-4">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-bold text-church-navy">Service Attendance</h3>
              <p className="text-xs text-church-slate">Headcounts & visitor trends</p>
            </div>
          </div>
          <button 
            onClick={() => handleExportCSV('attendance')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 border-2 border-purple-100 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-colors"
          >
            <Download size={16} className="mr-2" /> Export CSV
          </button>
        </div>

        {/* Giving Report (Protected) */}
        {canSeeGiving && (
          <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-church-green flex items-center justify-center mr-4">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="font-bold text-church-navy">Financial Giving</h3>
                <p className="text-xs text-church-slate">Tithes, offerings & funds</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-church-slate uppercase mb-1">Filter by Fund</label>
              <ModernDropdown
                value={selectedGivingFund}
                onChange={(val) => setSelectedGivingFund(val)}
                options={[
                  { value: 'all', label: 'All Funds' },
                  ...fundsList.map(f => ({ value: f.id, label: f.name }))
                ]}
              />
            </div>
            <button 
              onClick={() => handleExportCSV('giving')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border-2 border-green-100 text-church-green font-bold rounded-xl hover:bg-green-50 transition-colors"
            >
              <Download size={16} className="mr-2" /> Export CSV
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
