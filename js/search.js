// Поиск пользователей с Firebase

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const snapshot = await database.ref('users/' + user.uid).once('value');
    currentUserData = snapshot.val();
    currentUserData.uid = user.uid;
});

async function searchUsers() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!query) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    const usersSnapshot = await database.ref('users').once('value');
    const results = [];
    
    usersSnapshot.forEach((child) => {
        const user = child.val();
        user.uid = child.key;
        
        if (user.uid !== currentUserData.uid && 
            user.username.toLowerCase().includes(query)) {
            results.push(user);
        }
    });
    
    const resultsContainer = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: #666;">Пользователи не найдены</p>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(user => `
        <div class="user-card">
            <div class="user-info">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                    <h3>${user.fullName}</h3>
                    <p>@${user.username}</p>
                </div>
            </div>
            <button onclick="startChat('${user.uid}')">Написать</button>
        </div>
    `).join('');
}

async function startChat(otherUid) {
    // Создаем ID чата из отсортированных UID
    const chatId = [currentUserData.uid, otherUid].sort().join('_');
    
    // Проверяем существование чата
    const chatSnapshot = await database.ref('chats/' + chatId).once('value');
    
    if (!chatSnapshot.exists()) {
        // Создаем новый чат
        await database.ref('chats/' + chatId).set({
            participants: {
                [currentUserData.uid]: true,
                [otherUid]: true
            },
            createdAt: new Date().toISOString(),
            messages: {}
        });
    }
    
    window.location.href = `messages.html?chat=${chatId}`;
}
