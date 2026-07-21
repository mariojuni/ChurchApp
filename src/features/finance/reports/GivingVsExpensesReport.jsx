import React from 'react';

export default function GivingVsExpensesReport({ data }) {
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
        No giving or expense data available for this report.
      </div>
    );
  }

  // Calculate totals for footer
  const totalGiving = data.reduce((sum, row) => sum + row.giving, 0);
  const totalExpenses = data.reduce((sum, row) => sum + row.expenses, 0);
  const totalNet = data.reduce((sum, row) => sum + row.net, 0);

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Period</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Giving</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Expenses</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-bold text-church-navy">
                {row.period}
              </td>
              <td className="py-4 px-4 font-medium text-church-green text-right">
                {formatCurrency(row.giving)}
              </td>
              <td className="py-4 px-4 font-medium text-rose-500 text-right">
                {formatCurrency(row.expenses)}
              </td>
              <td className={`py-4 px-4 font-bold text-right ${row.net >= 0 ? 'text-church-navy' : 'text-amber-500'}`}>
                {formatCurrency(row.net)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-100 bg-gray-50/50">
            <td className="py-4 px-4 font-extrabold text-church-navy">Total</td>
            <td className="py-4 px-4 font-extrabold text-church-green text-right">{formatCurrency(totalGiving)}</td>
            <td className="py-4 px-4 font-extrabold text-rose-500 text-right">{formatCurrency(totalExpenses)}</td>
            <td className={`py-4 px-4 font-extrabold text-right ${totalNet >= 0 ? 'text-church-navy' : 'text-amber-500'}`}>
              {formatCurrency(totalNet)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
