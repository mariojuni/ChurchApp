import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
};

const formatTime12h = (time24) => {
  if (!time24) return 'Select time';
  const [h, m] = time24.split(':');
  const hNum = parseInt(h, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export default function ModernTimePicker({ name, value, onChange, placeholder = "Select time" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      setInputValue(formatTime12h(value));
    } else {
      setInputValue('');
    }
  }, [value]);

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (timeStr) => {
    if (onChange) {
      onChange({ target: { name, value: timeStr } });
    }
    setIsOpen(false);
  };

  const parseTime = (timeStr) => {
    const lower = timeStr.toLowerCase().replace(/\s/g, '');
    let h = 0, m = 0;
    const isPM = lower.includes('pm');
    const isAM = lower.includes('am');
    const cleanStr = lower.replace(/[a-z]/g, '');
    const parts = cleanStr.split(':');
    
    if (parts.length >= 1) {
      h = parseInt(parts[0], 10);
      if (parts.length > 1) {
        m = parseInt(parts[1], 10);
      }
    }
    
    if (isNaN(h)) return null;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleInputBlur = () => {
    if (inputValue.trim() === '') {
      if (onChange) onChange({ target: { name, value: '' } });
      return;
    }
    const parsed = parseTime(inputValue);
    if (parsed) {
      if (onChange) onChange({ target: { name, value: parsed } });
    } else {
      if (value) setInputValue(formatTime12h(value));
      else setInputValue('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className={`w-full px-4 py-2.5 bg-white border ${isOpen ? 'border-church-green ring-1 ring-church-green' : 'border-gray-300'} rounded-xl text-left focus-within:ring-2 focus-within:ring-church-green focus-within:border-transparent transition-all hover:border-church-green/50 flex items-center justify-between shadow-sm`}
      >
        <div className="flex items-center gap-3 w-full">
          <Clock size={18} className={value ? "text-church-green shrink-0" : "text-gray-400 shrink-0"} />
          <input
            type="text"
            name={name}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full block truncate text-sm font-medium focus:outline-none bg-transparent ${inputValue ? 'text-church-navy' : 'text-gray-400'}`}
          />
        </div>
        <ChevronDown 
          size={18} 
          onClick={() => setIsOpen(!isOpen)}
          className={`text-gray-400 transition-transform duration-200 cursor-pointer shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar">
            {timeOptions.map((time) => (
              <div 
                key={time}
                onClick={() => handleSelect(time)}
                className={`px-4 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer transition-colors ${
                  value === time 
                    ? 'bg-church-green text-white font-semibold' 
                    : 'text-church-slate hover:bg-gray-50'
                }`}
              >
                {formatTime12h(time)}
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="w-full px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
