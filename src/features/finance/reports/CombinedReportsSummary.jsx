import React from 'react';
import { DollarSign, Receipt, CreditCard, Clock } from 'lucide-react';

export default function CombinedReportsSummary({ data }) {
  const { totalGiving, totalExpenses, netBalance, pendingCount, approvedCount, expenseCount } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Giving */}
        <div className="bg-white rounded-3xl p-6 border-2 border-church-green/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-church-green/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-gray-500 font-bold text-sm tracking-wider uppercase">Total Giving</h3>
            <div className="w-10 h-10 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center">
              <DollarSign size={20} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-4xl font-extrabold text-church-navy tracking-tight relative z-10">
            {formatCurrency(totalGiving)}
          </p>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            {approvedCount} approved record{approvedCount !== 1 && 's'}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-3xl p-6 border-2 border-rose-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-gray-500 font-bold text-sm tracking-wider uppercase">Total Expenses</h3>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <Receipt size={20} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-4xl font-extrabold text-church-navy tracking-tight relative z-10">
            {formatCurrency(totalExpenses)}
          </p>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            {expenseCount} expense record{expenseCount !== 1 && 's'}
          </p>
        </div>

        {/* Net Balance */}
        <div className={`bg-white rounded-3xl p-6 border-2 relative overflow-hidden ${netBalance >= 0 ? 'border-church-blue/20' : 'border-amber-100'}`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none ${netBalance >= 0 ? 'bg-church-blue/5' : 'bg-amber-50'}`} />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-gray-500 font-bold text-sm tracking-wider uppercase">Net Balance</h3>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${netBalance >= 0 ? 'bg-church-blue/10 text-church-blue' : 'bg-amber-50 text-amber-500'}`}>
              <CreditCard size={20} strokeWidth={2.5} />
            </div>
          </div>
          <p className={`text-4xl font-extrabold tracking-tight relative z-10 ${netBalance >= 0 ? 'text-church-navy' : 'text-amber-600'}`}>
            {formatCurrency(netBalance)}
          </p>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            Giving minus expenses
          </p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mr-4 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="font-bold text-amber-800">Pending Verification</h4>
            <p className="text-sm text-amber-700">
              There {pendingCount === 1 ? 'is' : 'are'} {pendingCount} giving record{pendingCount !== 1 && 's'} pending verification. Pending records are not included in the totals above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
