/**
 * Maps Firebase Auth error codes to readable user-facing messages.
 * Never expose raw Firebase technical error strings in the UI.
 */
const FIREBASE_ERROR_MAP = {
  'auth/invalid-email':              'Please enter a valid email address.',
  'auth/user-not-found':             'No account found with this email address.',
  'auth/wrong-password':             'Incorrect password. Please try again.',
  'auth/invalid-credential':         'Incorrect email or password. Please try again.',
  'auth/too-many-requests':          'Too many failed attempts. Please wait a moment before trying again.',
  'auth/user-disabled':              'Your account has been disabled. Please contact your church administrator.',
  'auth/network-request-failed':     'Network error. Please check your connection and try again.',
  'auth/email-already-in-use':       'This email address is already in use.',
  'auth/weak-password':              'Password must be at least 6 characters.',
  'auth/popup-closed-by-user':       'Sign-in was cancelled.',
  'auth/cancelled-popup-request':    'Sign-in was cancelled.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
};

/**
 * Returns a friendly error message for a Firebase Auth error.
 * Falls back to a generic message if the code is not mapped.
 *
 * @param {Error & { code?: string }} error
 * @returns {string}
 */
export function getFriendlyAuthError(error) {
  if (error?.code && FIREBASE_ERROR_MAP[error.code]) {
    return FIREBASE_ERROR_MAP[error.code];
  }
  return 'Something went wrong. Please try again.';
}
