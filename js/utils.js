// Утилиты для работы с данными

let currentUserData = null;

function getCurrentUser() {
    return currentUserData;
}

function checkAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const snapshot = await database.ref('users/' + user.uid).once('value');
            currentUserData = snapshot.val();
            if (currentUserData) {
                currentUserData.uid = user.uid;
            }
        } else {
            window.location.href = 'index.html';
        }
    });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
}

async function getAllUsers() {
    const snapshot = await database.ref('users').once('value');
    const users = [];
    snapshot.forEach((child) => {
        const user = child.val();
        user.uid = child.key;
        users.push(user);
    });
    return users;
}

async function updateUser(user) {
    await database.ref('users/' + user.uid).update(user);
}
