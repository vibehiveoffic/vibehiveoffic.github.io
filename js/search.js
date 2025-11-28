// Поиск пользователей

checkAuth();

function searchUsers() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const currentUser = getCurrentUser();
    const users = getAllUsers();
    
    if (!query) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    const results = users.filter(u => 
        u.username !== currentUser.username && 
        u.username.toLowerCase().includes(query)
    );
    
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
            <button onclick="startChat('${user.username}')">Написать</button>
        </div>
    `).join('');
}

function startChat(username) {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const currentUser = getCurrentUser();
    
    const chatId = [currentUser.username, username].sort().join('_');
    
    if (!chats.find(c => c.id === chatId)) {
        chats.push({
            id: chatId,
            participants: [currentUser.username, username],
            messages: [],
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('chats', JSON.stringify(chats));
    }
    
    window.location.href = `messages.html?chat=${chatId}`;
}
