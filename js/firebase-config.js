import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYQm0K_4EdKHvvXOs81raKmstmAsRdT6g",
  authDomain: "controlemeubolso.firebaseapp.com",
  databaseURL: "https://controlemeubolso-default-rtdb.firebaseio.com",
  projectId: "controlemeubolso",
  storageBucket: "controlemeubolso.firebasestorage.app",
  messagingSenderId: "369393280169",
  appId: "1:369393280169:web:0b0d768f074e0ff4c775b8",
  measurementId: "G-0EYHJF137F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };