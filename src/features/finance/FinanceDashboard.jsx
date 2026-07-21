import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import DateRangeFilter from '../../components/ui/DateRangeFilter';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function FinanceDashboard() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [givingRecords, setGivingRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Filter state
  const [dateFilter, setDateFilter] = useState({
    filterType: 'thisMonth',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!CHURCH_ID) return;

    let givingUnsubscribe = () => {};
    let expensesUnsubscribe = () => {};

    const fetchFinanceData = async () => {
      // 1. Fetch Giving Records
      const givingQuery = query(collection(db, 'givingRecords'), where('churchId', '==', CHURCH_ID));
      givingUnsubscribe = onSnapshot(givingQuery, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGivingRecords(docs);
      });

      // 2. Fetch Expenses
      const expensesQuery = query(collection(db, 'givingExpenses'), where('churchId', '==', CHURCH_ID));
      expensesUnsubscribe = onSnapshot(expensesQuery, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExpenses(docs);
        setLoading(false);
      });
    };

    fetchFinanceData();

    return () => {
      givingUnsubscribe();
      expensesUnsubscribe();
    };
  }, [CHURCH_ID]);

  // Apply Date Filter in-memory to avoid missing Firestore indexes
  const filteredGiving = useMemo(() => {
    return givingRecords.filter(r => {
      if (!['completed', 'approved'].includes(r.status)) return false;
      const dDate = r.transactionDate || r.date || '';
      if (dateFilter.startDate && dDate < dateFilter.startDate) return false;
      if (dateFilter.endDate && dDate > dateFilter.endDate) return false;
      return true;
    });
  }, [givingRecords, dateFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const dDate = e.date || '';
      if (dateFilter.startDate && dDate < dateFilter.startDate) return false;
      if (dateFilter.endDate && dDate > dateFilter.endDate) return false;
      return true;
    });
  }, [expenses, dateFilter]);

  // Calculate KPIs
  const totalGiving = filteredGiving.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netBalance = totalGiving - totalExpenses;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  // Prepare Bar Chart Data (Income vs Expenses)
  const barChartData = {
    labels: ['Income', 'Expenses'],
    datasets: [
      {
        label: 'Amount',
        data: [totalGiving, totalExpenses],
        backgroundColor: ['#10b981', '#ef4444'], // solid emerald and red
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 60,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b', // slate-800
        padding: 12,
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
        bodyFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
        displayColors: false,
        callbacks: {
          label: (context) => formatCurrency(context.raw)
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { font: { family: "'Inter', sans-serif", weight: '600', size: 13 }, color: '#64748b' }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9', // slate-100
          borderDash: [5, 5],
          drawBorder: false,
        },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 12 },
          color: '#94a3b8',
          callback: (value) => '₱' + (value >= 1000 ? (value / 1000) + 'k' : value)
        }
      }
    }
  };

  // Prepare Doughnut Chart Data (Fund Distribution)
  const fundTotals = filteredGiving.reduce((acc, record) => {
    // If we have fundType mapped, use it. Else map it
    const fund = record.fundType || 'Others';
    acc[fund] = (acc[fund] || 0) + (record.amount || 0);
    return acc;
  }, {});

  const doughnutData = {
    labels: Object.keys(fundTotals),
    datasets: [
      {
        data: Object.values(fundTotals),
        backgroundColor: [
          '#10b981', // emerald
          '#6366f1', // indigo
          '#8b5cf6', // purple
          '#f59e0b', // amber
          '#ec4899', // pink
          '#0ea5e9', // sky
        ],
        borderWidth: 0,
        hoverOffset: 4,
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
          color: '#64748b'
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        bodyFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
        callbacks: {
          label: (context) => ` ${context.label}: ${formatCurrency(context.raw)}`
        }
      }
    },
    cutout: '75%',
    layout: { padding: 10 }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Finance Overview</h1>
          <p className="text-sm text-church-slate mt-1">Summary of giving and expenses.</p>
        </div>
        
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <DateRangeFilter onChange={setDateFilter} defaultFilter="thisMonth" />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading financial data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Giving */}
            <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-church-slate mb-1">Total Giving</p>
                <h3 className="text-3xl font-bold text-church-green">
                  {formatCurrency(totalGiving)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-church-green">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-church-slate mb-1">Total Expenses</p>
                <h3 className="text-3xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <TrendingDown size={24} />
              </div>
            </div>

            {/* Net Balance */}
            <div className="bg-church-navy rounded-3xl p-6 shadow-lg border border-church-navy flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-blue-100 mb-1">Net Balance</p>
                <h3 className={`text-3xl font-bold ${netBalance >= 0 ? 'text-white' : 'text-red-300'}`}>
                  {formatCurrency(netBalance)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white relative z-10">
                <Wallet size={24} />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 h-80 flex flex-col">
              <h3 className="text-church-navy font-bold mb-4">Income vs Expenses</h3>
              <div className="flex-1 relative">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 h-80 flex flex-col">
              <h3 className="text-church-navy font-bold mb-4">Fund Distribution</h3>
              <div className="flex-1 relative">
                {filteredGiving.length > 0 ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <Activity size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No giving data for this period</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
