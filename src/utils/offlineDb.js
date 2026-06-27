import { get, set, del, keys } from 'idb-keyval';

// Prefix keys to avoid collisions
const INDEX_PREFIX = 'yv_index_';
const PASSAGE_PREFIX = 'yv_passage_';

/**
 * Saves the index of a Bible translation (books and chapters).
 */
export const saveBibleIndex = async (translationId, indexData) => {
  try {
    await set(`${INDEX_PREFIX}${translationId}`, indexData);
    return true;
  } catch (error) {
    console.error(`Failed to save index for ${translationId}:`, error);
    return false;
  }
};

/**
 * Retrieves the index of a Bible translation.
 */
export const getBibleIndex = async (translationId) => {
  try {
    return await get(`${INDEX_PREFIX}${translationId}`);
  } catch (error) {
    return null;
  }
};

/**
 * Saves a specific chapter/passage.
 */
export const saveChapter = async (translationId, passageId, chapterData) => {
  try {
    await set(`${PASSAGE_PREFIX}${translationId}_${passageId}`, chapterData);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Retrieves a specific chapter/passage.
 */
export const getChapter = async (translationId, passageId) => {
  try {
    return await get(`${PASSAGE_PREFIX}${translationId}_${passageId}`);
  } catch (error) {
    return null;
  }
};

/**
 * Deletes all stored data for a specific Bible translation (index + all passages).
 */
export const deleteOfflineBible = async (translationId) => {
  try {
    const allKeys = await keys();
    
    // Delete index
    await del(`${INDEX_PREFIX}${translationId}`);
    
    // Delete all passages for this translation
    const passageKeyPrefix = `${PASSAGE_PREFIX}${translationId}_`;
    const keysToDelete = allKeys.filter(k => 
      typeof k === 'string' && k.startsWith(passageKeyPrefix)
    );
    
    for (const k of keysToDelete) {
      await del(k);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete offline bible for ${translationId}:`, error);
    return false;
  }
};

/**
 * Checks if a Bible index is available offline.
 */
export const isBibleOffline = async (translationId) => {
  try {
    const offlineIndex = await get(`${INDEX_PREFIX}${translationId}`);
    return !!offlineIndex;
  } catch (error) {
    return false;
  }
};
