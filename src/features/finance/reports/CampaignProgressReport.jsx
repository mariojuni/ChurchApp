import React from 'react';

export default function CampaignProgressReport({ data }) {
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
        No campaign data available for this report.
      </div>
    );
  }

  // Calculate totals for footer
  const totalGoal = data.reduce((sum, row) => sum + row.goalAmount, 0);
  const totalRaised = data.reduce((sum, row) => sum + row.raisedAmount, 0);
  const totalExpenses = data.reduce((sum, row) => sum + row.expenses, 0);
  const totalNet = data.reduce((sum, row) => sum + row.netRaised, 0);

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Campaign</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Goal</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Raised</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Expenses</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Net Raised</th>
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-center">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-bold text-church-navy">
                {row.campaignName}
              </td>
              <td className="py-4 px-4 font-medium text-gray-500 text-right">
                {formatCurrency(row.goalAmount)}
              </td>
              <td className="py-4 px-4 font-medium text-church-green text-right">
                {formatCurrency(row.raisedAmount)}
              </td>
              <td className="py-4 px-4 font-medium text-rose-500 text-right">
                {formatCurrency(row.expenses)}
              </td>
              <td className={`py-4 px-4 font-bold text-right ${row.netRaised >= 0 ? 'text-church-navy' : 'text-amber-500'}`}>
                {formatCurrency(row.netRaised)}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-center">
                  <div className="w-full bg-gray-100 rounded-full h-2.5 max-w-[100px] mr-2">
                    <div 
                      className={`h-2.5 rounded-full ${row.progressPercent >= 100 ? 'bg-church-green' : 'bg-church-blue'}`} 
                      style={{ width: `${Math.min(row.progressPercent, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-gray-600">
                    {row.progressPercent.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-100 bg-gray-50/50">
            <td className="py-4 px-4 font-extrabold text-church-navy">Total</td>
            <td className="py-4 px-4 font-extrabold text-gray-500 text-right">{formatCurrency(totalGoal)}</td>
            <td className="py-4 px-4 font-extrabold text-church-green text-right">{formatCurrency(totalRaised)}</td>
            <td className="py-4 px-4 font-extrabold text-rose-500 text-right">{formatCurrency(totalExpenses)}</td>
            <td className={`py-4 px-4 font-extrabold text-right ${totalNet >= 0 ? 'text-church-navy' : 'text-amber-500'}`}>
              {formatCurrency(totalNet)}
            </td>
            <td className="py-4 px-4"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
