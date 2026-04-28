import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsZi26_RYt3O0KwTWXtwCaWvKUvBdVPsc",
  authDomain: "prepforexams-aabbd.firebaseapp.com",
  projectId: "prepforexams-aabbd",
  storageBucket: "prepforexams-aabbd.firebasestorage.app",
  messagingSenderId: "695819792541",
  appId: "1:695819792541:web:0bcf3ec41a02cff7fea474",
  measurementId: "G-4L3CSQFGJ2",
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
