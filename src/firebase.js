// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7nmiBr1KZwbb8cyQAvedUUww9odNSTYA",
  authDomain: "botica-nova.firebaseapp.com",
  projectId: "botica-nova",
  storageBucket: "botica-nova.firebasestorage.app",
  messagingSenderId: "600939649104",
  appId: "1:600939649104:web:65d4d9e916f31092f1d955",
  measurementId: "G-07XBZ7HW7S"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios
export const db = getFirestore(app);
export const auth = getAuth(app);