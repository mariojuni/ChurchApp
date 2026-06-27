import { getBibleIndex, saveBibleIndex, getChapter, saveChapter, deleteOfflineBible } from './offlineDb';

const API_BASE = 'https://api.youversion.com/v1';
const API_KEY = 'RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f'; // Provided by user

const getHeaders = () => ({
  'x-yvp-app-key': API_KEY,
  'Accept': 'application/json'
});

/**
 * Fetch all available Languages.
 */
export const fetchLanguages = async () => {
  try {
    const response = await fetch(`${API_BASE}/languages`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch languages');
    const data = await response.json();
    return data.data; 
  } catch (error) {
    console.error("Error fetching languages:", error);
    return [];
  }
};

/**
 * Fetch Verse of the Day text and reference.
 */
export const fetchVerseOfTheDay = async (translationId = '111') => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    
    // Get passage ID
    const votdRes = await fetch(`${API_BASE}/verse_of_the_days/${dayOfYear}`, { headers: getHeaders() });
    if (!votdRes.ok) return null;
    const votdData = await votdRes.json();
    const passageId = votdData.passage_id || (votdData.data && votdData.data.passage_id);
    if (!passageId) return null;

    // Fetch passage text
    const passageRes = await fetch(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`, { headers: getHeaders() });
    if (!passageRes.ok) return null;
    const passageData = await passageRes.json();
    
    // Parse HTML to plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = passageData.content || (passageData.data && passageData.data.content) || '';
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up verse numbers from text (usually start of string)
    const cleanText = text.replace(/^\d+\s*/, '').trim();

    return {
      text: cleanText,
      reference: passageData.reference || (passageData.data && passageData.data.reference),
      passageId: passageId
    };
  } catch (e) {
    console.error("Error fetching Verse of the Day:", e);
    return null;
  }
};

/**
 * Fetch Organization details
 */
export const fetchOrganization = async (orgId) => {
  if (!orgId) return null;
  try {
    const response = await fetch(`${API_BASE}/organizations/${orgId}`, { headers: getHeaders() });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
};

/**
 * Fetch Bibles by Language.
 * @param {string} languageTag - e.g. 'eng'
 */
export const fetchBiblesByLanguage = async (languageTag) => {
  try {
    const response = await fetch(`${API_BASE}/bibles?language_ranges[]=${languageTag}&all_available=false`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch bibles for language');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error fetching bibles for ${languageTag}:`, error);
    return [];
  }
};

/**
 * Fetch the index (books and chapters) for a specific Bible.
 * First checks offline storage.
 */
export const fetchBibleIndex = async (translationId) => {
  // Check offline db first
  const offlineIndex = await getBibleIndex(translationId);
  if (offlineIndex) {
    return offlineIndex;
  }

  try {
    const response = await fetch(`${API_BASE}/bibles/${translationId}/index`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch bible index');
    const data = await response.json();
    
    // If it's a saved version, cache it offline
    const savedVersions = getSavedVersions();
    if (savedVersions.some(v => String(v.id) === String(translationId))) {
      await saveBibleIndex(translationId, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching index for ${translationId}:`, error);
    return null;
  }
};

/**
 * Fetch a specific passage (chapter text).
 * First checks offline storage.
 */
export const fetchChapterHTML = async (translationId, passageId) => {
  // Check offline db first
  const offlineChapter = await getChapter(translationId, passageId);
  if (offlineChapter) {
    return offlineChapter;
  }

  try {
    const response = await fetch(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch passage');
    const data = await response.json();
    
    // If it's a saved version, cache it offline
    const savedVersions = getSavedVersions();
    if (savedVersions.some(v => String(v.id) === String(translationId))) {
      await saveChapter(translationId, passageId, data.content);
    }
    
    return data.content;
  } catch (error) {
    console.error(`Error fetching passage ${passageId} for ${translationId}:`, error);
    return null;
  }
};

/**
 * Helper to download an entire Bible offline.
 * This fetches the index, then asynchronously fetches all chapters to cache them.
 */
export const downloadBibleOffline = async (translationId) => {
  try {
    // 1. Fetch and save index
    const response = await fetch(`${API_BASE}/bibles/${translationId}/index`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch bible index for download');
    const indexData = await response.json();
    await saveBibleIndex(translationId, indexData);
    
    // 2. Extract all passage IDs (chapters)
    const allPassageIds = [];
    for (const book of indexData.books) {
      for (const chapter of book.chapters) {
        // YouVersion uses passage_id
        if (chapter.passage_id) {
          allPassageIds.push(chapter.passage_id);
        }
      }
    }

    // 3. Start a background download queue (batching to avoid rate limits)
    // We don't await this because it could take minutes. We let it run in the background.
    startBackgroundDownload(translationId, allPassageIds);
    
    return true;
  } catch (error) {
    console.error("Error initiating offline download:", error);
    return false;
  }
};

/**
 * Background worker to fetch and save passages.
 */
const startBackgroundDownload = async (translationId, passageIds) => {
  const BATCH_SIZE = 5; // Fetch 5 at a time
  
  for (let i = 0; i < passageIds.length; i += BATCH_SIZE) {
    const batch = passageIds.slice(i, i + BATCH_SIZE);
    
    await Promise.allSettled(batch.map(async (passageId) => {
      // Check if already downloaded
      const exists = await getChapter(translationId, passageId);
      if (exists) return;
      
      try {
        const response = await fetch(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`, { headers: getHeaders() });
        if (response.ok) {
          const data = await response.json();
          await saveChapter(translationId, passageId, data.content);
        }
      } catch (e) {
        // Silently fail, it will be cached on-demand if the user visits it later
      }
    }));
    
    // Small delay to be polite to the API
    await new Promise(res => setTimeout(res, 200));
  }
};


// --- Local Storage Management for "My Versions" ---

export const getSavedVersions = () => {
  const saved = localStorage.getItem('my_bible_versions');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length > 0) return parsed;
  }
  
  // Default to NASB2020 if no versions are saved
  const defaultVersion = {
    id: 2692,
    abbreviation: "NASB2020",
    language_tag: "en",
    localized_abbreviation: "NASB2020",
    localized_title: "New American Standard Bible - NASB",
    title: "New American Standard Bible 2020"
  };
  
  // Save it so it's formally initialized
  localStorage.setItem('my_bible_versions', JSON.stringify([defaultVersion]));
  return [defaultVersion];
};

export const saveVersion = (version) => {
  const saved = getSavedVersions();
  if (!saved.some(v => String(v.id) === String(version.id))) {
    const newSaved = [...saved, version];
    localStorage.setItem('my_bible_versions', JSON.stringify(newSaved));
    return newSaved;
  }
  return saved;
};

export const removeVersion = (versionId) => {
  const saved = getSavedVersions();
  const newSaved = saved.filter(v => String(v.id) !== String(versionId));
  localStorage.setItem('my_bible_versions', JSON.stringify(newSaved));
  // Also clean up offline db
  deleteOfflineBible(versionId);
  return newSaved;
};

// --- User Preferences ---
export const getUserPreferences = () => {
    const prefs = localStorage.getItem('bible_prefs');
    if (prefs) return JSON.parse(prefs);
    return {
        activeTranslation: '2692', // Default fallback (NASB2020 in YouVersion)
        activeBook: 'GEN',
        activeChapter: '1',
        activePassageId: 'GEN.1',
        highlights: {}
    };
}

export const saveUserPreferences = (prefs) => {
    localStorage.setItem('bible_prefs', JSON.stringify(prefs));
}
