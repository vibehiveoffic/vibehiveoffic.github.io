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
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("Firebase успешно инициализирован");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

// Глобальные переменные для Firebase сервисов
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Упрощенные настройки Firestore для разработки
db.settings({
    timestampsInSnapshots: true
});
