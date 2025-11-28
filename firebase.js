// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvjxwFkEOk-g4c9DpjdjD-aEacJTLlnMs",
    authDomain: "vibehive-2aca0.firebaseapp.com",
    projectId: "vibehive-2aca0",
    databaseURL: "https://vibehive-2aca0-default-rtdb.firebaseio.com",
    storageBucket: "vibehive-2aca0.firebasestorage.app",
    messagingSenderId: "1093593459509",
    appId: "1:1093593459509:web:45607408d5b5f225dcba7c"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Глобальные переменные для Firebase сервисов (без const/let/var для глобальной видимости)
var auth = firebase.auth();
var database = firebase.database();