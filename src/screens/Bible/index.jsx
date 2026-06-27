import React, { useState, useEffect } from 'react';
import BibleReader from './BibleReader';
import VersionManager from './VersionManager';
// VersionDiscovery removed
import BibleLanguagesModal from './BibleLanguagesModal';
import { getUserPreferences, saveUserPreferences, getSavedVersions, fetchBibleIndex, saveVersion } from '../../utils/bibleApi';
import BooksModal from './BooksModal';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Bible = ({ theme }) => {
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState('reader'); // 'reader', 'discovery'
  const [isVersionManagerOpen, setIsVersionManagerOpen] = useState(false);
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);
  const [isLanguagesModalOpen, setIsLanguagesModalOpen] = useState(false);
  const [selectedDiscoveryTranslation, setSelectedDiscoveryTranslation] = useState(null);
  const [preferences, setPreferences] = useState(getUserPreferences());
  const [savedVersions, setSavedVersions] = useState(getSavedVersions());
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const loadBooks = async () => {
      const data = await fetchBibleIndex(preferences.activeTranslation);
      if (data && data.books) {
        setBooks(data.books);
      } else {
        setBooks([]);
      }
    };
    loadBooks();
  }, [preferences.activeTranslation]);

  // Fetch highlights from Firestore when user logs in
  useEffect(() => {
    const fetchUserHighlights = async () => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'bible', 'preferences');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().highlights) {
            setPreferences(prev => ({
              ...prev,
              highlights: {
                ...(prev.highlights || {}),
                ...docSnap.data().highlights
              }
            }));
          }
        } catch (error) {
          console.error("Error fetching Bible highlights from Firebase:", error);
        }
      }
    };
    fetchUserHighlights();
  }, [currentUser]);

  // Save preferences whenever they change locally
  useEffect(() => {
    saveUserPreferences(preferences);
  }, [preferences]);

  // Refresh saved versions
  const loadSavedVersions = () => {
    setSavedVersions(getSavedVersions());
  };

  const handleUpdatePreferences = (updates) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, ...updates };
      // Sync highlights to Firestore if the user is authenticated
      if (updates.highlights && currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'bible', 'preferences');
        setDoc(docRef, { highlights: updates.highlights }, { merge: true })
          .catch(err => console.error("Error saving Bible highlights to Firebase:", err));
      }
      return newPrefs;
    });
  };

  const handleVersionChange = (id) => {
    handleUpdatePreferences({ activeTranslation: id });
  };

  return (
    <section className="screen active">
      {currentView === 'reader' && (
        <BibleReader 
          preferences={preferences} 
          updatePreferences={handleUpdatePreferences}
          onOpenBooks={() => setIsBooksModalOpen(true)}
          onOpenVersionManager={() => setIsVersionManagerOpen(true)}
          books={books}
          activeVersionObj={savedVersions.find(v => String(v.id) === String(preferences.activeTranslation))}
        />
      )}
      
      <VersionManager 
        isOpen={isVersionManagerOpen} 
        savedVersions={savedVersions}
        activeTranslation={preferences.activeTranslation}
        refreshSavedVersions={loadSavedVersions}
        onSelectVersion={(id) => {
          handleVersionChange(id);
          setIsVersionManagerOpen(false);
        }}
        onDiscover={() => {
          setIsVersionManagerOpen(false);
          setCurrentView('discovery');
        }}
        onAddVersionClick={() => {
           setIsLanguagesModalOpen(true);
        }}
        onClose={() => setIsVersionManagerOpen(false)}
      />

      <BibleLanguagesModal 
        isOpen={isLanguagesModalOpen}
        onClose={() => setIsLanguagesModalOpen(false)}
        savedVersionIds={savedVersions.map(v => v.id)}
        onVersionAdded={(translation) => {
          loadSavedVersions();
          // Optionally, auto-select the newly added version and close modals
          handleVersionChange(translation.id);
          setIsLanguagesModalOpen(false);
          setIsVersionManagerOpen(false);
        }}
      />

      {currentView === 'reader' && (
        <BooksModal 
          isOpen={isBooksModalOpen}
          onClose={() => setIsBooksModalOpen(false)}
          books={books}
          onSelectChapter={(bookId, chapterNum) => {
             handleUpdatePreferences({ activeBook: bookId, activeChapter: chapterNum });
             setIsBooksModalOpen(false);
          }}
        />
      )}

      {/* Removed VersionDiscovery */}
    </section>
  );
};

export default Bible;
