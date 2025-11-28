// Управление профилем

checkAuth();
loadProfile();

function loadProfile() {
    const user = getCurrentUser();
    
    document.getElementById('profileInfo').innerHTML = `
        <div class="profile-info">
            <h2>${user.fullName}</h2>
            <p class="username">@${user.username}</p>
            <p>${user.email}</p>
            ${user.bio ? `<p style="margin-top: 10px;">${user.bio}</p>` : ''}
            ${user.city ? `<p>📍 ${user.city}</p>` : ''}
            ${user.birthday ? `<p>🎂 ${new Date(user.birthday).toLocaleDateString('ru-RU')}</p>` : ''}
        </div>
    `;
    
    document.getElementById('editFullName').value = user.fullName;
    document.getElementById('editBio').value = user.bio || '';
    document.getElementById('editCity').value = user.city || '';
    document.getElementById('editBirthday').value = user.birthday || '';
    
    loadUserPosts();
}

function updateProfile(event) {
    event.preventDefault();
    
    const user = getCurrentUser();
    user.fullName = document.getElementById('editFullName').value.trim();
    user.bio = document.getElementById('editBio').value.trim();
    user.city = document.getElementById('editCity').value.trim();
    user.birthday = document.getElementById('editBirthday').value;
    
    updateUser(user);
    
    alert('Профиль обновлен!');
    loadProfile();
}

function loadUserPosts() {
    const user = getCurrentUser();
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const userPosts = posts.filter(p => p.author === user.username);
    
    const postsContainer = document.getElementById('userPosts');
    
    if (userPosts.length === 0) {
        postsContainer.innerHTML = '<p style="color: #666;">У вас пока нет постов</p>';
        return;
    }
    
    postsContainer.innerHTML = userPosts.map(post => `
        <div class="post">
            <div class="post-header">
                <span class="timestamp">${formatDate(post.timestamp)}</span>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
                <span>❤️ ${post.likes.length}</span>
            </div>
        </div>
    `).join('');
}
