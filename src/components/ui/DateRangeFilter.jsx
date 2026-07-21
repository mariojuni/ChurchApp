import React, { useState, useEffect } from 'react';
import ModernDropdown from './ModernDropdown';
import ModernDatePicker from './ModernDatePicker';

const FILTER_OPTIONS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function DateRangeFilter({ onChange, defaultFilter = 'thisMonth' }) {
  const [filterType, setFilterType] = useState(defaultFilter);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Helper to format date to YYYY-MM-DD local time
  const formatDate = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getRange = (type) => {
    const now = new Date();
    let start, end;
    switch (type) {
      case 'today':
        start = new Date(now);
        end = new Date(now);
        break;
      case 'thisWeek':
        start = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return { start: null, end: null };
    }
    return { 
      startDate: formatDate(start), 
      endDate: formatDate(end) 
    };
  };

  useEffect(() => {
    if (filterType !== 'custom') {
      const { startDate, endDate } = getRange(filterType);
      onChange({ filterType, startDate, endDate });
    }
  }, [filterType]); // Intentionally not including onChange to avoid loops

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      onChange({ filterType: 'custom', startDate: customStart, endDate: customEnd });
    }
  };

  const handleClear = () => {
    setFilterType(defaultFilter);
    setCustomStart('');
    setCustomEnd('');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
      <div className="w-48">
        <ModernDropdown
          options={FILTER_OPTIONS}
          value={filterType}
          onChange={(val) => setFilterType(val)}
          placeholder="Date Range"
        />
      </div>
      
      {filterType === 'custom' && (
        <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
          <div className="w-36">
            <ModernDatePicker
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              placeholder="Start Date"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="w-36">
            <ModernDatePicker
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              placeholder="End Date"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!customStart || !customEnd}
            className="px-3 py-1.5 bg-church-navy text-white text-sm rounded-lg hover:bg-church-navy/90 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
      
      {filterType !== defaultFilter && (
        <button
          onClick={handleClear}
          className="text-sm text-gray-500 hover:text-church-navy underline"
        >
          Clear Filter
        </button>
      )}
    </div>
  );
}
