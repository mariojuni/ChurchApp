import React, { useState } from 'react';
import { X, Upload, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { importDiscipleshipPlanJSON } from './discipleshipService';

export default function DiscipleshipImportModal({ isOpen, onClose, onImportSuccess }) {
  const { activeChurchId, currentUser } = useAuth();
  const [jsonFile, setJsonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setError('Please upload a valid JSON file.');
        return;
      }
      setJsonFile(file);
      setError('');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const rawParsed = JSON.parse(event.target.result);
          
          // Support JSON where the plan is wrapped in a "plan" key
          let actualPlan = rawParsed.plan ? rawParsed.plan : rawParsed;

          // Normalize plan keys to camelCase/lowercase for flexibility
          actualPlan = Object.keys(actualPlan).reduce((acc, key) => {
            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            acc[normalizedKey] = actualPlan[key];
            return acc;
          }, {});

          // Normalize keys inside the weeks array as well
          if (Array.isArray(actualPlan.weeks)) {
            actualPlan.weeks = actualPlan.weeks.map(week => {
              if (typeof week !== 'object' || !week) return week;
              
              // Safely un-nest known containers
              const weekData = { ...week };
              if (weekData.content && typeof weekData.content === 'object') {
                Object.assign(weekData, weekData.content);
                delete weekData.content;
              }
              if (weekData.leaderGuide && typeof weekData.leaderGuide === 'object') {
                Object.assign(weekData, weekData.leaderGuide);
                delete weekData.leaderGuide;
              }
              
              return Object.keys(weekData).reduce((acc, key) => {
                const flatKey = key.replace(/[\s_-]/g, '').toLowerCase();
                
                const keyMap = {
                  'story': 'storyText',
                  'storytext': 'storyText',
                  'retell': 'retellActivity',
                  'retellactivity': 'retellActivity',
                  'discussion': 'discussionQuestions',
                  'discussionquestions': 'discussionQuestions',
                  'keytruths': 'keyTruths',
                  'application': 'applicationQuestions',
                  'applicationquestions': 'applicationQuestions',
                  'memoryverse': 'memoryVerse',
                  'chaptertitle': 'chapterTitle',
                  'scripturereference': 'scriptureReference',
                  'scripture': 'scriptureReference',
                  'suggestedflow': 'suggestedFlow',
                  'retellinstruction': 'retellInstruction',
                  'duration': 'estimatedDurationMinutes',
                  'estimateddurationminutes': 'estimatedDurationMinutes',
                  'weeknumber': 'weekNumber',
                  'chapternumber': 'chapterNumber'
                };

                let finalVal = weekData[key];
                if (typeof finalVal === 'object' && finalVal !== null) {
                  try {
                    // Try to format arrays as clean bullet points or newlines if simple
                    if (Array.isArray(finalVal)) {
                      if (finalVal.every(item => typeof item === 'string')) {
                        finalVal = finalVal.join('\n\n');
                      } else {
                        // It's an array of objects (like {order: 1, question: "..."}). Format it cleanly.
                        const textArray = finalVal.map(item => {
                          if (typeof item === 'object' && item !== null) {
                            // Find meaningful content keys
                            const contentKey = Object.keys(item).find(k => 
                              ['question', 'truth', 'text', 'activity', 'application', 'content', 'verse'].includes(k.toLowerCase())
                            );
                            
                            if (contentKey && typeof item[contentKey] === 'string') {
                               if (item.order) return `${item.order}. ${item[contentKey]}`;
                               return item[contentKey];
                            } else {
                               // Fallback: extract all string values
                               const strings = Object.values(item).filter(v => typeof v === 'string');
                               if (item.order && strings.length > 0) return `${item.order}. ${strings.join(' - ')}`;
                               if (strings.length > 0) return strings.join('\n');
                               return JSON.stringify(item); // absolute fallback
                            }
                          }
                          return String(item);
                        });
                        finalVal = textArray.join('\n\n');
                      }
                    } else {
                      // It's a single object! Like additionalStudy: { text: "..." }
                      const contentKey = Object.keys(finalVal).find(k => 
                        ['question', 'truth', 'text', 'activity', 'application', 'content', 'verse'].includes(k.toLowerCase())
                      );
                      if (contentKey && typeof finalVal[contentKey] === 'string') {
                        finalVal = finalVal[contentKey];
                      } else {
                        const strings = Object.values(finalVal).filter(v => typeof v === 'string');
                        if (strings.length > 0) {
                          finalVal = strings.join('\n');
                        } else {
                          finalVal = JSON.stringify(finalVal, null, 2);
                        }
                      }
                    }
                  } catch (e) {
                    finalVal = String(finalVal);
                  }
                }

                if (keyMap[flatKey]) {
                  acc[keyMap[flatKey]] = finalVal;
                } else {
                  let camelKey = key.replace(/[\s_-]+(.)/g, (m, g1) => g1.toUpperCase());
                  camelKey = camelKey.charAt(0).toLowerCase() + camelKey.slice(1);
                  acc[camelKey] = finalVal;
                }
                return acc;
              }, {});
            });
          }

          // Simple validation
          if (!actualPlan.title || !actualPlan.weeks || !Array.isArray(actualPlan.weeks)) {
            const foundKeys = Object.keys(actualPlan).join(', ');
            setError(`Invalid JSON structure. Missing 'title' or 'weeks' array. Found keys: ${foundKeys || 'none'}`);
            setPreviewData(null);
          } else {
            setPreviewData(actualPlan);
          }
        } catch (err) {
          setError('Failed to parse JSON file.');
          setPreviewData(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    setLoading(true);
    setError('');
    try {
      await importDiscipleshipPlanJSON(activeChurchId, currentUser?.uid, previewData);
      onImportSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to import plan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-church-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mr-3">
              <Upload size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-church-navy">Import Plan JSON</h2>
              <p className="text-sm text-gray-500">Upload a discipleship plan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-start">
              <AlertCircle size={16} className="mt-0.5 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 relative hover:bg-gray-100 transition-colors">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-church-navy font-medium">Click or drag JSON file here</p>
            <p className="text-sm text-gray-500 mt-1">
              {jsonFile ? jsonFile.name : 'Must follow discipleship JSON schema'}
            </p>
          </div>

          {previewData && (
            <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-sm font-bold text-church-navy mb-2">Preview</h3>
              <p className="text-sm text-gray-600"><strong>Title:</strong> {previewData.title}</p>
              <p className="text-sm text-gray-600"><strong>Subtitle:</strong> {previewData.subtitle || 'N/A'}</p>
              <p className="text-sm text-gray-600"><strong>Total Weeks:</strong> {previewData.weeks.length}</p>
              <p className="text-xs text-blue-600 font-medium mt-2">
                This plan will be imported as Draft and assigned to your current active church workspace.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || loading}
            className="flex items-center px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
