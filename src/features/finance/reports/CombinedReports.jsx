import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context/AuthContext';
import { Activity } from 'lucide-react';
import DateRangeFilter from '../../../components/ui/DateRangeFilter';
import ModernDropdown from '../../../components/ui/ModernDropdown';
import { canViewCombinedReports } from '../../../utils/financePermissions';

import CombinedReportsSummary from './CombinedReportsSummary';
import GivingVsExpensesReport from './GivingVsExpensesReport';
import FundBalanceReport from './FundBalanceReport';
import CampaignProgressReport from './CampaignProgressReport';
import MonthlyFinanceReport from './MonthlyFinanceReport';
import {
  getFinanceSummaryReport,
  getGivingVsExpensesReport,
  getFundBalanceReport,
  getCampaignProgressReport,
  getMonthlyFinanceReport
} from '../services/financeReportService';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'giving_expenses', label: 'Giving vs Expenses' },
  { id: 'funds', label: 'Fund Balances' },
  { id: 'campaigns', label: 'Campaign Progress' },
  { id: 'monthly', label: 'Monthly' },
];

export default function CombinedReports() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';

  const [activeTab, setActiveTab] = useState('summary');
  
  // Raw data state
  const [givingRecords, setGivingRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [funds, setFunds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [dateFilter, setDateFilter] = useState({
    filterType: 'thisMonth',
    startDate: '',
    endDate: ''
  });
  const [selectedFundId, setSelectedFundId] = useState('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState('all');

  useEffect(() => {
    if (!CHURCH_ID) return;
    if (!canViewCombinedReports(userProfile)) return;

    let givingUnsubscribe = () => {};
    let expensesUnsubscribe = () => {};

    const fetchData = async () => {
      try {
        // Fetch funds and campaigns once (they are small)
        const qFunds = query(collection(db, 'givingFunds'), where('churchId', '==', CHURCH_ID));
        const fundsSnap = await getDocs(qFunds);
        const fetchedFunds = fundsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFunds(fetchedFunds);

        const qCampaigns = query(collection(db, 'givingCampaigns'), where('churchId', '==', CHURCH_ID));
        const campaignsSnap = await getDocs(qCampaigns);
        const fetchedCampaigns = campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(fetchedCampaigns);

        // Subscribe to giving and expenses
        const qGiving = query(collection(db, 'givingRecords'), where('churchId', '==', CHURCH_ID));
        givingUnsubscribe = onSnapshot(qGiving, (snapshot) => {
          setGivingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qExpenses = query(collection(db, 'givingExpenses'), where('churchId', '==', CHURCH_ID));
        expensesUnsubscribe = onSnapshot(qExpenses, (snapshot) => {
          setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

      } catch (e) {
        console.error("Failed to fetch finance report data", e);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      givingUnsubscribe();
      expensesUnsubscribe();
    };
  }, [CHURCH_ID, userProfile]);

  // Apply filters in-memory
  const filteredGiving = useMemo(() => {
    return givingRecords.filter(r => {
      const dDate = r.transactionDate || r.date || '';
      if (dateFilter.startDate && dDate < dateFilter.startDate) return false;
      if (dateFilter.endDate && dDate > dateFilter.endDate) return false;
      if (selectedFundId !== 'all' && r.fundId !== selectedFundId) return false;
      if (selectedCampaignId !== 'all' && r.campaignId !== selectedCampaignId) return false;
      return true;
    });
  }, [givingRecords, dateFilter, selectedFundId, selectedCampaignId]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const dDate = e.date || '';
      if (dateFilter.startDate && dDate < dateFilter.startDate) return false;
      if (dateFilter.endDate && dDate > dateFilter.endDate) return false;
      if (selectedFundId !== 'all' && e.fundId !== selectedFundId) return false;
      if (selectedCampaignId !== 'all' && e.campaignId !== selectedCampaignId) return false;
      return true;
    });
  }, [expenses, dateFilter, selectedFundId, selectedCampaignId]);

  if (!canViewCombinedReports(userProfile)) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto mt-12">
        <h2 className="text-2xl font-bold text-church-navy mb-4">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to view combined reports.</p>
      </div>
    );
  }

  // Generate Reports
  const summaryReport = getFinanceSummaryReport(filteredGiving, filteredExpenses, dateFilter);
  const givingVsExpensesReport = getGivingVsExpensesReport(filteredGiving, filteredExpenses, dateFilter);
  const fundBalanceReport = getFundBalanceReport(filteredGiving, filteredExpenses, funds, dateFilter);
  const campaignProgressReport = getCampaignProgressReport(filteredGiving, filteredExpenses, campaigns, dateFilter);
  const monthlyReport = getMonthlyFinanceReport(filteredGiving, filteredExpenses, dateFilter);

  // Dropdown options
  const fundOptions = [
    { value: 'all', label: 'All Funds' },
    ...funds.map(f => ({ value: f.id, label: f.name }))
  ];

  const campaignOptions = [
    { value: 'all', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.title }))
  ];

  const hasData = filteredGiving.length > 0 || filteredExpenses.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100">
        <div>
          <h2 className="text-2xl font-extrabold text-church-navy mb-1">Combined Reports</h2>
          <p className="text-gray-500 text-sm">View giving, expenses, fund balances, campaign progress, and net balance in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter onChange={setDateFilter} defaultFilter="thisMonth" />
          <div className="w-48">
            <ModernDropdown
              options={fundOptions}
              value={selectedFundId}
              onChange={(val) => setSelectedFundId(val)}
              placeholder="Filter by Fund"
            />
          </div>
          <div className="w-48">
            <ModernDropdown
              options={campaignOptions}
              value={selectedCampaignId}
              onChange={(val) => setSelectedCampaignId(val)}
              placeholder="Filter by Campaign"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-church-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-church-green border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading reports...</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 bg-white rounded-3xl shadow-church-soft border border-gray-100 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="mx-auto w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-6 border border-gray-100">
              <Activity size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-gray-400 mb-2">No Data Available</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              No finance report data found for the selected filters.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto custom-scrollbar pb-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-church-navy text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-church-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-6 min-h-[50vh]">
            {activeTab === 'summary' && <CombinedReportsSummary data={summaryReport} />}
            {activeTab === 'giving_expenses' && <GivingVsExpensesReport data={givingVsExpensesReport} />}
            {activeTab === 'funds' && <FundBalanceReport data={fundBalanceReport} />}
            {activeTab === 'campaigns' && <CampaignProgressReport data={campaignProgressReport} />}
            {activeTab === 'monthly' && <MonthlyFinanceReport data={monthlyReport} />}
          </div>
        </>
      )}
    </div>
  );
}
