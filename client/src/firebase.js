// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// You can find this in the Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyCZ77SG3Jq1eSmzvhXpvF2uElBBKuLe1Us",
  authDomain: "soulsync-event-app.firebaseapp.com",
  databaseURL: "https://soulsync-event-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "soulsync-event-app",
  storageBucket: "soulsync-event-app.firebasestorage.app",
  messagingSenderId: "830662076898",
  appId: "1:830662076898:web:49bd7e026682064a83f1bb",
  measurementId: "G-QNNTSGFL61"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
