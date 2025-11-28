// Утилиты для работы с данными

function getCurrentUser() {
    const username = localStorage.getItem('currentUser');
    if (!username) return null;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(u => u.username === username);
}

function checkAuth() {
    if (!getCurrentUser()) {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
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

function getAllUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function updateUser(user) {
    const users = getAllUsers();
    const index = users.findIndex(u => u.username === user.username);
    if (index !== -1) {
        users[index] = user;
        localStorage.setItem('users', JSON.stringify(users));
    }
}
