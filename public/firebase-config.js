import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDrBNt7xGcmVFk4bwReYiKek7PoEvX36Xo",
  authDomain: "hanzi-tracker.firebaseapp.com",
  projectId: "hanzi-tracker",
  storageBucket: "hanzi-tracker.firebasestorage.app",
  messagingSenderId: "1034492266986",
  appId: "1:1034492266986:web:7f5777ea436c7e7c23ca93",
  measurementId: "G-X61YY5CCL9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
