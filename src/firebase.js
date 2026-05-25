import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAc6sewcJJd3irf3Zn-H2BrUKQN62rLRuk",
  authDomain: "movemate-41c23.firebaseapp.com",
  projectId: "movemate-41c23",
  storageBucket: "movemate-41c23.firebasestorage.app",
  messagingSenderId: "303841763736",
  appId: "1:303841763736:web:c2fd898156bf4ae832cbed",
  measurementId: "G-B54EYZKW5J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export default app;
