class VibeHiveApp {
    constructor() {
        this.currentUser = null;
        this.discussions = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCustomCursor();
        this.loadDiscussions();
    }

    setupEventListeners() {
        // Создание поста
        document.getElementById('submitPost').addEventListener('click', () => this.createPost());

        // Управление профилем
        document.getElementById('profileBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showProfileModal();
        });

        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSettingsModal();
        });

        document.getElementById('adminBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminModal();
        });

        // Настройки
        document.getElementById('customCursorToggle').addEventListener('change', (e) => {
            this.updateSetting('customCursor', e.target.checked);
        });

        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            this.updateSetting('darkMode', e.target.checked);
        });

        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchDiscussions(e.target.value);
        });

        // Закрытие модальных окон при клике вне
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setupCustomCursor() {
        const cursor = document.getElementById('customCursor');
        
        document.addEventListener('mousemove', (e) => {
            if (document.body.classList.contains('custom-cursor-enabled')) {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            }
        });

        // Добавление эффектов при наведении
        const hoverElements = ['button', 'a', 'input', 'textarea', '.discussion'];
        hoverElements.forEach(selector => {
            document.addEventListener('mouseover', (e) => {
                if (e.target.matches(selector)) {
                    cursor.classList.add('hover');
                }
            });

            document.addEventListener('mouseout', (e) => {
                if (e.target.matches(selector)) {
                    cursor.classList.remove('hover');
                }
            });
        });
    }

    async loadDiscussions() {
        try {
            const snapshot = await db.collection('discussions')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            this.discussions = [];
            const feed = document.getElementById('discussionsFeed');
            feed.innerHTML = '';

            if (snapshot.empty) {
                feed.innerHTML = `
                    <div class="welcome-message">
                        <h3>Пока нет обсуждений</h3>
                        <p>Будьте первым, кто создаст обсуждение!</p>
                    </div>
                `;
                return;
            }

            snapshot.forEach(doc => {
                const discussion = { id: doc.id, ...doc.data() };
                this.discussions.push(discussion);
                this.renderDiscussion(discussion);
            });
        } catch (error) {
            console.error('Ошибка загрузки обсуждений:', error);
            authSystem.showNotification('Ошибка загрузки обсуждений', 'error');
        }
    }

    renderDiscussion(discussion) {
        const feed = document.getElementById('discussionsFeed');
        
        const discussionEl = document.createElement('div');
        discussionEl.className = 'discussion';
        discussionEl.innerHTML = `
            <div class="discussion-header">
                <img src="${discussion.authorAvatar || 'https://via.placeholder.com/40'}" 
                     alt="Аватар" class="discussion-avatar">
                <div class="discussion-meta">
                    <div class="discussion-author">${discussion.authorName}</div>
                    <div class="discussion-date">${this.formatDate(discussion.createdAt)}</div>
                </div>
            </div>
            <h3 class="discussion-title">${discussion.title}</h3>
            <div class="discussion-content">${this.formatContent(discussion.content)}</div>
            ${discussion.attachment ? `
                <div class="discussion-attachment">
                    <a href="${discussion.attachment.url}" target="_blank" class="attachment-link">
                        📎 ${discussion.attachment.name}
                    </a>
                </div>
            ` : ''}
            <div class="discussion-actions">
                <button class="action-btn like-btn" data-id="${discussion.id}">
                    👍 <span class="like-count">${discussion.likes || 0}</span>
                </button>
                <button class="action-btn comment-btn" data-id="${discussion.id}">
                    💬 <span class="comment-count">${discussion.commentCount || 0}</span>
                </button>
                ${this.currentUser && this.currentUser.uid === discussion.authorId ? `
                    <button class="action-btn delete-btn" data-id="${discussion.id}">
                        🗑️ Удалить
                    </button>
                ` : ''}
            </div>
            <div class="comments-section" id="comments-${discussion.id}" style="display: none;">
                <div class="comment-input">
                    <input type="text" placeholder="Добавить комментарий..." id="comment-input-${discussion.id}">
                    <button class="btn-primary" onclick="app.addComment('${discussion.id}')">Комментировать</button>
                </div>
                <div class="comments-list" id="comments-list-${discussion.id}"></div>
            </div>
        `;

        feed.appendChild(discussionEl);

        // Добавление обработчиков событий
        discussionEl.querySelector('.like-btn').addEventListener('click', () => {
            this.likeDiscussion(discussion.id);
        });

        discussionEl.querySelector('.comment-btn').addEventListener('click', () => {
            this.toggleComments(discussion.id);
        });

        discussionEl.querySelector('.delete-btn')?.addEventListener('click', () => {
            this.deleteDiscussion(discussion.id);
        });
    }

    async createPost() {
        if (!auth.currentUser) {
            authSystem.showNotification('Пожалуйста, войдите в систему чтобы создать обсуждение', 'error');
            return;
        }

        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const file = document.getElementById('postFile').files[0];

        if (!title || !content) {
            authSystem.showNotification('Пожалуйста, заполните заголовок и содержание', 'error');
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
            const userData = userDoc.data();

            let attachment = null;
            if (file) {
                // Загрузка файла в Firebase Storage
                const storageRef = storage.ref();
                const fileRef = storageRef.child(`attachments/${Date.now()}_${file.name}`);
                await fileRef.put(file);
                const downloadURL = await fileRef.getDownloadURL();
                
                attachment = {
                    name: file.name,
                    url: downloadURL,
                    type: file.type
                };
            }

            // Создание обсуждения в Firestore
            await db.collection('discussions').add({
                title: title,
                content: content,
                authorId: auth.currentUser.uid,
                authorName: userData.username || auth.currentUser.email,
                authorAvatar: userData.avatar || '',
                attachment: attachment,
                likes: 0,
                commentCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Очистка формы
            document.getElementById('postTitle').value = '';
            document.getElementById('postContent').value = '';
            document.getElementById('postFile').value = '';

            authSystem.showNotification('Обсуждение успешно создано!', 'success');
            this.loadDiscussions();
        } catch (error) {
            authSystem.showNotification('Ошибка создания обсуждения: ' + error.message, 'error');
        }
    }

    async likeDiscussion(discussionId) {
        if (!auth.currentUser) {
            authSystem.showNotification('Пожалуйста, войдите в систему чтобы оценивать обсуждения', 'error');
            return;
        }

        try {
            const discussionRef = db.collection('discussions').doc(discussionId);
            await discussionRef.update({
                likes: firebase.firestore.FieldValue.increment(1)
            });

            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка оценки обсуждения:', error);
            authSystem.showNotification('Ошибка оценки обсуждения', 'error');
        }
    }

    async toggleComments(discussionId) {
        const commentsSection = document.getElementById(`comments-${discussionId}`);
        const isVisible = commentsSection.style.display !== 'none';
        
        commentsSection.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            await this.loadComments(discussionId);
        }
    }

    async loadComments(discussionId) {
        try {
            const snapshot = await db.collection('comments')
                .where('discussionId', '==', discussionId)
                .orderBy('createdAt', 'asc')
                .get();

            const commentsList = document.getElementById(`comments-list-${discussionId}`);
            commentsList.innerHTML = '';

            if (snapshot.empty) {
                commentsList.innerHTML = '<p>Пока нет комментариев</p>';
                return;
            }

            snapshot.forEach(doc => {
                const comment = doc.data();
                const commentEl = document.createElement('div');
                commentEl.className = 'comment';
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <strong class="comment-author">${comment.authorName}</strong>
                        <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                `;
                commentsList.appendChild(commentEl);
            });
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
            authSystem.showNotification('Ошибка загрузки комментариев', 'error');
        }
    }

    async addComment(discussionId) {
        if (!auth.currentUser) {
            authSystem.showNotification('Пожалуйста, войдите в систему чтобы комментировать', 'error');
            return;
        }

        const commentInput = document.getElementById(`comment-input-${discussionId}`);
        const content = commentInput.value.trim();

        if (!content) {
            authSystem.showNotification('Пожалуйста, введите комментарий', 'error');
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
            const userData = userDoc.data();

            // Добавление комментария
            await db.collection('comments').add({
                discussionId: discussionId,
                content: content,
                authorId: auth.currentUser.uid,
                authorName: userData.username || auth.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Обновление счетчика комментариев
            await db.collection('discussions').doc(discussionId).update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });

            commentInput.value = '';
            this.loadComments(discussionId);
            this.loadDiscussions(); // Обновление для обновления счетчика комментариев
        } catch (error) {
            authSystem.showNotification('Ошибка добавления комментария: ' + error.message, 'error');
        }
    }

    async deleteDiscussion(discussionId) {
        if (!confirm('Вы уверены, что хотите удалить это обсуждение?')) return;

        try {
            await db.collection('discussions').doc(discussionId).delete();
            
            // Также удаление связанных комментариев
            const commentsSnapshot = await db.collection('comments')
                .where('discussionId', '==', discussionId)
                .get();
            
            const batch = db.batch();
            commentsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            authSystem.showNotification('Обсуждение успешно удалено!', 'success');
            this.loadDiscussions();
        } catch (error) {
            authSystem.showNotification('Ошибка удаления обсуждения: ' + error.message, 'error');
        }
    }

    formatContent(content) {
        // Базовое форматирование похожее на markdown
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now - date;
        
        // Форматирование относительного времени
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
        
        return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
    }

    showProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.style.display = 'block';

        // Загрузка текущих данных профиля
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                const userData = doc.data();
                document.getElementById('profileUsername').value = userData.username || '';
                document.getElementById('profileBio').value = userData.bio || '';
            });
        }

        // Обработка отправки формы профиля
        document.getElementById('profileForm').onsubmit = (e) => this.updateProfile(e);
    }

    async updateProfile(e) {
        e.preventDefault();
        if (!auth.currentUser) return;

        const username = document.getElementById('profileUsername').value;
        const bio = document.getElementById('profileBio').value;
        const avatarFile = document.getElementById('profileAvatar').files[0];

        try {
            let avatarURL = '';
            
            if (avatarFile) {
                // Загрузка аватара
                const storageRef = storage.ref();
                const avatarRef = storageRef.child(`avatars/${auth.currentUser.uid}`);
                await avatarRef.put(avatarFile);
                avatarURL = await avatarRef.getDownloadURL();
            }

            const updateData = {
                username: username,
                bio: bio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (avatarURL) {
                updateData.avatar = avatarURL;
            }

            await db.collection('users').doc(auth.currentUser.uid).update(updateData);
            
            document.getElementById('profileModal').style.display = 'none';
            authSystem.showNotification('Профиль успешно обновлен!', 'success');
            
            // Обновление данных пользователя
            authSystem.handleUserLogin(auth.currentUser);
        } catch (error) {
            authSystem.showNotification('Ошибка обновления профиля: ' + error.message, 'error');
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'block';

        // Загрузка текущих настроек
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                const userData = doc.data();
                const settings = userData.settings || {};
                
                document.getElementById('customCursorToggle').checked = settings.customCursor || false;
                document.getElementById('darkModeToggle').checked = settings.darkMode || false;
            });
        }
    }

    async updateSetting(key, value) {
        if (!auth.currentUser) return;

        try {
            await db.collection('users').doc(auth.currentUser.uid).update({
                [`settings.${key}`]: value
            });

            // Применение настройки немедленно
            if (key === 'customCursor') {
                if (value) {
                    document.body.classList.add('custom-cursor-enabled');
                } else {
                    document.body.classList.remove('custom-cursor-enabled');
                }
            }

            if (key === 'darkMode') {
                document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light');
            }

            authSystem.showNotification('Настройка обновлена!', 'success');
        } catch (error) {
            authSystem.showNotification('Ошибка обновления настройки: ' + error.message, 'error');
        }
    }

    showAdminModal() {
        const modal = document.getElementById('adminModal');
        modal.style.display = 'block';
        this.loadAdminData();
    }

    async loadAdminData() {
        // Загрузка пользователей
        const usersSnapshot = await db.collection('users').get();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        if (usersSnapshot.empty) {
            usersList.innerHTML = '<p>Нет пользователей</p>';
        } else {
            usersSnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userEl = document.createElement('div');
                userEl.className = 'user-item';
                userEl.innerHTML = `
                    <div>
                        <strong>${user.username || user.email}</strong>
                        <div>${user.email} - ${user.role}</div>
                    </div>
                    <div>
                        <button class="btn-secondary" onclick="app.promoteUser('${user.id}')">
                            ${user.role === 'admin' ? 'Понизить' : 'Повысить до админа'}
                        </button>
                        <button class="btn-primary" onclick="app.deleteUser('${user.id}')">Удалить</button>
                    </div>
                `;
                usersList.appendChild(userEl);
            });
        }

        // Загрузка постов для админа
        const postsSnapshot = await db.collection('discussions').get();
        const postsList = document.getElementById('adminPostsList');
        postsList.innerHTML = '';

        if (postsSnapshot.empty) {
            postsList.innerHTML = '<p>Нет постов</p>';
        } else {
            postsSnapshot.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                const postEl = document.createElement('div');
                postEl.className = 'post-item';
                postEl.innerHTML = `
                    <div>
                        <strong>${post.title}</strong>
                        <div>от ${post.authorName}</div>
                    </div>
                    <button class="btn-primary" onclick="app.adminDeletePost('${post.id}')">Удалить</button>
                `;
                postsList.appendChild(postEl);
            });
        }
    }

    async promoteUser(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const currentRole = userDoc.data().role;
            const newRole = currentRole === 'admin' ? 'user' : 'admin';

            await db.collection('users').doc(userId).update({
                role: newRole
            });

            authSystem.showNotification(`Пользователь успешно ${newRole === 'admin' ? 'повышен' : 'понижен'}!`, 'success');
            this.loadAdminData();
        } catch (error) {
            authSystem.showNotification('Ошибка обновления роли пользователя: ' + error.message, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) return;

        try {
            // Удаление обсуждений пользователя
            const discussionsSnapshot = await db.collection('discussions')
                .where('authorId', '==', userId)
                .get();

            const batch = db.batch();
            discussionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Удаление комментариев пользователя
            const commentsSnapshot = await db.collection('comments')
                .where('authorId', '==', userId)
                .get();

            commentsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Удаление документа пользователя
            batch.delete(db.collection('users').doc(userId));

            await batch.commit();
            authSystem.showNotification('Пользователь успешно удален!', 'success');
            this.loadAdminData();
        } catch (error) {
            authSystem.showNotification('Ошибка удаления пользователя: ' + error.message, 'error');
        }
    }

    async adminDeletePost(postId) {
        if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;

        try {
            await this.deleteDiscussion(postId);
            this.loadAdminData();
        } catch (error) {
            authSystem.showNotification('Ошибка удаления поста: ' + error.message, 'error');
        }
    }

    searchDiscussions(query) {
        const discussions = document.querySelectorAll('.discussion');
        
        discussions.forEach(discussion => {
            const title = discussion.querySelector('.discussion-title').textContent.toLowerCase();
            const content = discussion.querySelector('.discussion-content').textContent.toLowerCase();
            
            if (title.includes(query.toLowerCase()) || content.includes(query.toLowerCase())) {
                discussion.style.display = 'block';
            } else {
                discussion.style.display = 'none';
            }
        });
    }
}

// Инициализация приложения
const app = new VibeHiveApp();

// Обновление ссылки на текущего пользователя при изменении состояния аутентификации
auth.onAuthStateChanged((user) => {
    app.currentUser = user;
});