// Управление профилем с Firebase

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const snapshot = await database.ref('users/' + user.uid).once('value');
    currentUserData = snapshot.val();
    currentUserData.uid = user.uid;
    
    loadProfile();
});

function loadProfile() {
    if (!currentUserData) return;
    
    document.getElementById('profileInfo').innerHTML = `
        <div class="profile-info">
            <h2>${currentUserData.fullName}</h2>
            <p class="username">@${currentUserData.username}</p>
            <p>${currentUserData.email}</p>
            ${currentUserData.bio ? `<p style="margin-top: 10px;">${currentUserData.bio}</p>` : ''}
            ${currentUserData.city ? `<p>📍 ${currentUserData.city}</p>` : ''}
            ${currentUserData.birthday ? `<p>🎂 ${new Date(currentUserData.birthday).toLocaleDateString('ru-RU')}</p>` : ''}
        </div>
    `;
    
    document.getElementById('editFullName').value = currentUserData.fullName;
    document.getElementById('editBio').value = currentUserData.bio || '';
    document.getElementById('editCity').value = currentUserData.city || '';
    document.getElementById('editBirthday').value = currentUserData.birthday || '';
    
    loadUserPosts();
}

async function updateProfile(event) {
    event.preventDefault();
    
    const updates = {
        fullName: document.getElementById('editFullName').value.trim(),
        bio: document.getElementById('editBio').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        birthday: document.getElementById('editBirthday').value
    };
    
    await database.ref('users/' + currentUserData.uid).update(updates);
    
    currentUserData = { ...currentUserData, ...updates };
    
    alert('Профиль обновлен!');
    loadProfile();
}

async function loadUserPosts() {
    const postsSnapshot = await database.ref('posts').orderByChild('author').equalTo(currentUserData.uid).once('value');
    const userPosts = [];
    
    postsSnapshot.forEach((child) => {
        const post = child.val();
        post.id = child.key;
        userPosts.push(post);
    });
    
    userPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const postsContainer = document.getElementById('userPosts');
    
    if (userPosts.length === 0) {
        postsContainer.innerHTML = '<p style="color: #666;">У вас пока нет постов</p>';
        return;
    }
    
    postsContainer.innerHTML = userPosts.map(post => {
        const likesCount = post.likes ? Object.keys(post.likes).length : 0;
        return `
            <div class="post">
                <div class="post-header">
                    <span class="timestamp">${formatDate(post.timestamp)}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <span>❤️ ${likesCount}</span>
                </div>
            </div>
        `;
    }).join('');
}
