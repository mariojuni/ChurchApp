export const getFinanceSummaryReport = (givingRecords, expenses, filters) => {
  let totalGiving = 0;
  let totalExpenses = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let expenseCount = 0;

  givingRecords.forEach(record => {
    if (record.status === 'pending') {
      pendingCount++;
    } else if (record.status === 'approved' || record.status === 'completed') {
      approvedCount++;
      totalGiving += (Number(record.amount) || 0);
    }
  });

  expenses.forEach(expense => {
    expenseCount++;
    totalExpenses += (Number(expense.amount) || 0);
  });

  return {
    totalGiving,
    totalExpenses,
    netBalance: totalGiving - totalExpenses,
    pendingCount,
    approvedCount,
    expenseCount
  };
};

export const getGivingVsExpensesReport = (givingRecords, expenses, filters) => {
  // Determine grouping: if range > 31 days, group by month, else group by day
  const msPerDay = 1000 * 60 * 60 * 24;
  const rangeMs = new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime();
  const groupBy = (rangeMs > 31 * msPerDay) ? 'month' : 'day';

  const dataMap = {}; // { 'YYYY-MM-DD' or 'YYYY-MM': { period, giving, expenses } }

  const getKey = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return groupBy === 'month' ? dateStr.substring(0, 7) : dateStr.substring(0, 10);
  };

  givingRecords.forEach(record => {
    if (record.status === 'approved' || record.status === 'completed') {
      const d = record.transactionDate || record.date;
      const key = getKey(d);
      if (!dataMap[key]) dataMap[key] = { period: key, giving: 0, expenses: 0 };
      dataMap[key].giving += (Number(record.amount) || 0);
    }
  });

  expenses.forEach(expense => {
    const d = expense.date;
    const key = getKey(d);
    if (!dataMap[key]) dataMap[key] = { period: key, giving: 0, expenses: 0 };
    dataMap[key].expenses += (Number(expense.amount) || 0);
  });

  const result = Object.values(dataMap).map(row => ({
    ...row,
    net: row.giving - row.expenses
  }));

  // Sort by period ascending
  result.sort((a, b) => a.period.localeCompare(b.period));

  return result;
};

export const getFundBalanceReport = (givingRecords, expenses, funds, filters) => {
  const fundMap = {}; // fundId -> data

  funds.forEach(fund => {
    fundMap[fund.id] = {
      fundId: fund.id,
      fundName: fund.name,
      fundType: fund.type || 'Standard',
      totalGiving: 0,
      totalExpenses: 0,
      balance: 0,
      isActive: fund.status === 'active'
    };
  });

  givingRecords.forEach(record => {
    if (record.status === 'approved' || record.status === 'completed') {
      const fId = record.fundId;
      if (fId) {
        if (!fundMap[fId]) {
          fundMap[fId] = { fundId: fId, fundName: record.fundType || 'Unknown', fundType: 'Unknown', totalGiving: 0, totalExpenses: 0, balance: 0, isActive: false };
        }
        fundMap[fId].totalGiving += (Number(record.amount) || 0);
      }
    }
  });

  expenses.forEach(expense => {
    const fId = expense.fundId;
    if (fId) {
      if (!fundMap[fId]) {
        fundMap[fId] = { fundId: fId, fundName: expense.fundType || 'Unknown', fundType: 'Unknown', totalGiving: 0, totalExpenses: 0, balance: 0, isActive: false };
      }
      fundMap[fId].totalExpenses += (Number(expense.amount) || 0);
    }
  });

  let result = Object.values(fundMap).map(row => ({
    ...row,
    balance: row.totalGiving - row.totalExpenses
  }));

  // Only include active funds OR archived funds that have transactions in this period
  result = result.filter(row => row.isActive || row.totalGiving > 0 || row.totalExpenses > 0);

  result.sort((a, b) => a.fundName.localeCompare(b.fundName));

  return result;
};

export const getCampaignProgressReport = (givingRecords, expenses, campaigns, filters) => {
  const campMap = {};

  campaigns.forEach(c => {
    campMap[c.id] = {
      campaignId: c.id,
      campaignName: c.title,
      goalAmount: Number(c.goalAmount) || 0,
      raisedAmount: 0,
      expenses: 0,
      netRaised: 0,
      progressPercent: 0
    };
  });

  givingRecords.forEach(record => {
    if (record.status === 'approved' || record.status === 'completed') {
      const cId = record.campaignId;
      if (cId && campMap[cId]) {
        campMap[cId].raisedAmount += (Number(record.amount) || 0);
      }
    }
  });

  expenses.forEach(expense => {
    // Note: If expenses have campaignId
    const cId = expense.campaignId;
    if (cId && campMap[cId]) {
      campMap[cId].expenses += (Number(expense.amount) || 0);
    }
  });

  const result = Object.values(campMap).map(row => {
    const netRaised = row.raisedAmount - row.expenses;
    const progressPercent = row.goalAmount > 0 ? (row.raisedAmount / row.goalAmount) * 100 : 0;
    return {
      ...row,
      netRaised,
      progressPercent: Math.min(progressPercent, 100)
    };
  });

  result.sort((a, b) => a.campaignName.localeCompare(b.campaignName));

  return result;
};

export const getMonthlyFinanceReport = (givingRecords, expenses, filters) => {
  const dataMap = {}; // 'YYYY-MM' -> data

  const getMonthKey = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return dateStr.substring(0, 7);
  };

  givingRecords.forEach(record => {
    if (record.status === 'approved' || record.status === 'completed') {
      const key = getMonthKey(record.transactionDate || record.date);
      if (!dataMap[key]) dataMap[key] = { month: key, giving: 0, expenses: 0, transactionCount: 0 };
      dataMap[key].giving += (Number(record.amount) || 0);
      dataMap[key].transactionCount++;
    }
  });

  expenses.forEach(expense => {
    const key = getMonthKey(expense.date);
    if (!dataMap[key]) dataMap[key] = { month: key, giving: 0, expenses: 0, transactionCount: 0 };
    dataMap[key].expenses += (Number(expense.amount) || 0);
    dataMap[key].transactionCount++;
  });

  const result = Object.values(dataMap).map(row => ({
    ...row,
    netBalance: row.giving - row.expenses
  }));

  result.sort((a, b) => a.month.localeCompare(b.month));

  return result;
};
