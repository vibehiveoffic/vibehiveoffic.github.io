// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvjxwFkEOk-g4c9DpjdjD-aEacJTLlnMs",
    authDomain: "vibehive-2aca0.firebaseapp.com",
    projectId: "vibehive-2aca0",
    storageBucket: "vibehive-2aca0.firebasestorage.app",
    messagingSenderId: "1093593459509",
    appId: "1:1093593459509:web:45607408d5b5f225dcba7c"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Глобальные переменные для Firebase сервисов
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase инициализирован");