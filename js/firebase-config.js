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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Habilitar offline persistence
firebase.firestore().enablePersistence()
    .catch((err) => {
        console.error("Erro ao habilitar persistência offline:", err);
    });

console.log("Firebase configurado com sucesso!");
