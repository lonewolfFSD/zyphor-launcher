import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDh2JkdNSRAAYylXjtkdBYILrDjD116ETs",
  authDomain: "zyphor-studios-183c0.firebaseapp.com",
  projectId: "zyphor-studios-183c0",
  storageBucket: "zyphor-studios-183c0.firebasestorage.app",
  messagingSenderId: "241217785095",
  appId: "1:241217785095:web:f43ab2c70d200becd009a2",
  measurementId: "G-CBXPXT1WET"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);