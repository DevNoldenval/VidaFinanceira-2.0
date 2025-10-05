// Configuração do Firebase
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

// Importar Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar para uso em outros módulos
export { firebaseConfig, db, app };

// Tornar disponível globalmente para compatibilidade
window.firebaseConfig = firebaseConfig;
window.db = db;
window.app = app;

console.log("✅ Firebase configurado com sucesso!");
