import React from 'react';

export default function FundBalanceReport({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No fund data available for this report.
      </div>
    );
  }

  // Calculate totals for footer
  const totalGiving = data.reduce((sum, row) => sum + row.totalGiving, 0);
  const totalExpenses = data.reduce((sum, row) => sum + row.totalExpenses, 0);
  const totalBalance = data.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Fund Name</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Total Giving</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Total Expenses</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-bold text-church-navy">
                {row.fundName}
              </td>
              <td className="py-4 px-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  row.isActive ? 'bg-church-green/10 text-church-green' : 'bg-gray-100 text-gray-500'
                }`}>
                  {row.isActive ? 'Active' : 'Archived'}
                </span>
              </td>
              <td className="py-4 px-4 font-medium text-church-green text-right">
                {formatCurrency(row.totalGiving)}
              </td>
              <td className="py-4 px-4 font-medium text-rose-500 text-right">
                {formatCurrency(row.totalExpenses)}
              </td>
              <td className={`py-4 px-4 font-bold text-right ${row.balance >= 0 ? 'text-church-navy' : 'text-amber-500'}`}>
                {formatCurrency(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-100 bg-gray-50/50">
            <td className="py-4 px-4 font-extrabold text-church-navy" colSpan={2}>Total</td>
            <td className="py-4 px-4 font-extrabold text-church-green text-right">{formatCurrency(totalGiving)}</td>
            <td className="py-4 px-4 font-extrabold text-rose-500 text-right">{formatCurrency(totalExpenses)}</td>
            <td className={`py-4 px-4 font-extrabold text-right ${totalBalance >= 0 ? 'text-church-navy' : 'text-amber-500'}`}>
              {formatCurrency(totalBalance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
