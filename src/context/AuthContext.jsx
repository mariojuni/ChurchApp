import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeChurchId, setActiveChurchId] = useState(localStorage.getItem('activeChurchId') || null);
  const [loading, setLoading] = useState(true);

  // Persist activeChurchId when it changes
  useEffect(() => {
    if (activeChurchId) {
      localStorage.setItem('activeChurchId', activeChurchId);
    } else {
      localStorage.removeItem('activeChurchId');
    }
  }, [activeChurchId]);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch extended user profile from Firestore
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            
            // If they don't have a saved workspace, use their primary church
            if (!localStorage.getItem('activeChurchId')) {
              setActiveChurchId(data.churchId);
            }
          } else {
            setUserProfile(null);
            setActiveChurchId(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          setActiveChurchId(null);
        }
      } else {
        setUserProfile(null);
        setActiveChurchId(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const profileWithActiveChurch = userProfile 
    ? { ...userProfile, churchId: activeChurchId || userProfile.churchId } 
    : null;

  const value = {
    currentUser,
    userProfile: profileWithActiveChurch,
    originalUserProfile: userProfile,
    activeChurchId,
    setActiveChurchId,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
