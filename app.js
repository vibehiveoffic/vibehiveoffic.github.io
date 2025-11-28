// Главный класс приложения
class VibeHiveApp {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.discussions = [];
        this.init();
    }

    async init() {
        console.log("🚀 Инициализация VibeHive...");
        
        // Настройка обработчиков событий
        this.setupEventListeners();
        this.setupCustomCursor();
        
        // Настройка Firebase Auth слушателя
        this.setupAuthListener();
        
        // Проверка текущего состояния аутентификации
        await this.checkAuthState();
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            console.log("🔐 Изменение состояния аутентификации:", user ? "Вход" : "Выход");
            if (user) {
                await this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
        });
    }

    async checkAuthState() {
        try {
            const user = auth.currentUser;
            if (user) {
                await this.handleUserLogin(user);
            } else {
                this.showWelcomeScreen();
            }
        } catch (error) {
            console.error("Ошибка проверки состояния аутентификации:", error);
            this.showWelcomeScreen();
        }
    }

    async handleUserLogin(user) {
        console.log("👤 Обработка входа пользователя:", user.email);
        this.currentUser = user;
        
        try {
            // Получаем данные пользователя из Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                this.userData = userDoc.data();
                console.log("✅ Данные пользователя загружены:", this.userData);
            } else {
                // Создаем нового пользователя
                await this.createNewUser(user);
            }
            
            this.updateUIAfterLogin();
            await this.loadDiscussions();
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных пользователя:", error);
            this.showNotification("Ошибка загрузки данных. Попробуйте обновить страницу.", "error");
        }
    }

    async createNewUser(user) {
        console.log("📝 Создание нового пользователя...");
        const userData = {
            username: user.email.split('@')[0],
            email: user.email,
            createdAt: new Date(),
            role: 'user',
            bio: '',
            avatar: '',
            settings: {
                customCursor: false,
                darkMode: false
            }
        };
        
        try {
            await db.collection('users').doc(user.uid).set(userData);
            this.userData = userData;
            console.log("✅ Новый пользователь создан");
        } catch (error) {
            console.error("❌ Ошибка создания пользователя:", error);
            throw error;
        }
    }

    handleUserLogout() {
        console.log("👋 Обработка выхода пользователя");
        this.currentUser = null;
        this.userData = null;
        this.updateUIAfterLogout();
        this.showWelcomeScreen();
    }

    updateUIAfterLogin() {
        // Обновляем навигацию
        document.getElementById('navActions').style.display = 'none';
        document.getElementById('userMenu').style.display = 'flex';
        document.getElementById('createPost').style.display = 'block';
        
        // Обновляем информацию пользователя
        document.getElementById('userName').textContent = this.userData.username;
        
        if (this.userData.avatar) {
            document.getElementById('userAvatar').src = this.userData.avatar;
        }

        // Показываем кнопку админа если нужно
        if (this.userData.role === 'admin') {
            document.getElementById('adminBtn').style.display = 'block';
        }

        // Применяем настройки
        this.applyUserSettings();
    }

    updateUIAfterLogout() {
        document.getElementById('navActions').style.display = 'flex';
        document.getElementById('userMenu').style.display = 'none';
        document.getElementById('createPost').style.display = 'none';
        document.getElementById('adminBtn').style.display = 'none';
    }

    applyUserSettings() {
        if (!this.userData?.settings) return;
        
        const settings = this.userData.settings;
        
        // Кастомный курсор
        if (settings.customCursor) {
            document.body.classList.add('custom-cursor-enabled');
        } else {
            document.body.classList.remove('custom-cursor-enabled');
        }

        // Темная тема
        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    setupEventListeners() {
        console.log("⚙️ Настройка обработчиков событий...");
        
        // Аутентификация
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('registerBtn').addEventListener('click', () => this.showAuthModal('register'));
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Формы аутентификации
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Модальные окна
        this.setupModalHandlers();

        // Создание постов
        document.getElementById('submitPost').addEventListener('click', () => this.createPost());

        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchDiscussions(e.target.value);
        });

        // Профиль и настройки
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
    }

    setupModalHandlers() {
        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Переключение вкладок аутентификации
        document.querySelectorAll('.auth-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAuthTab(tabName);
            });
        });

        // Переключение вкладок админки
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAdminTab(tabName);
            });
        });

        // Закрытие при клике вне модального окна
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

        // Эффекты при наведении
        const hoverElements = ['button', 'a', 'input', 'textarea', '.discussion', '.action-btn'];
        document.addEventListener('mouseover', (e) => {
            if (hoverElements.some(selector => e.target.matches(selector))) {
                cursor.classList.add('hover');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (hoverElements.some(selector => e.target.matches(selector))) {
                cursor.classList.remove('hover');
            }
        });
    }

    // === АУТЕНТИФИКАЦИЯ ===
    showAuthModal(defaultTab = 'login') {
        const modal = document.getElementById('authModal');
        modal.style.display = 'block';
        this.switchAuthTab(defaultTab);
    }

    switchAuthTab(tabName) {
        document.querySelectorAll('.auth-tabs .tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            this.showNotification('Входим...', 'info');
            await auth.signInWithEmailAndPassword(email, password);
            document.getElementById('authModal').style.display = 'none';
            this.showNotification('Успешный вход!', 'success');
        } catch (error) {
            this.showNotification(this.getErrorMessage(error), 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!username || !email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            this.showNotification('Регистрируем...', 'info');
            await auth.createUserWithEmailAndPassword(email, password);
            document.getElementById('authModal').style.display = 'none';
            this.showNotification('Регистрация успешна!', 'success');
        } catch (error) {
            this.showNotification(this.getErrorMessage(error), 'error');
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.showNotification('Вы вышли из системы', 'success');
        } catch (error) {
            this.showNotification('Ошибка при выходе', 'error');
        }
    }

    // === ОБСУЖДЕНИЯ ===
    async loadDiscussions() {
        try {
            console.log("📥 Загрузка обсуждений...");
            const snapshot = await db.collection('discussions')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            this.discussions = [];
            const feed = document.getElementById('discussionsFeed');
            
            if (snapshot.empty) {
                feed.innerHTML = `
                    <div class="welcome-message">
                        <h3>Пока нет обсуждений</h3>
                        <p>Будьте первым, кто создаст обсуждение!</p>
                    </div>
                `;
                return;
            }

            feed.innerHTML = '';
            snapshot.forEach(doc => {
                const discussion = { 
                    id: doc.id, 
                    ...doc.data(),
                    // Преобразуем timestamp в дату
                    createdAt: doc.data().createdAt?.toDate?.() || new Date()
                };
                this.discussions.push(discussion);
                this.renderDiscussion(discussion);
            });
            
            console.log(`✅ Загружено ${this.discussions.length} обсуждений`);
        } catch (error) {
            console.error('❌ Ошибка загрузки обсуждений:', error);
            this.showNotification('Ошибка загрузки обсуждений', 'error');
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
            <h3 class="discussion-title">${this.escapeHtml(discussion.title)}</h3>
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
                    <input type="text" placeholder="Напишите комментарий..." id="comment-input-${discussion.id}">
                    <button class="btn-primary add-comment-btn" data-id="${discussion.id}">Отправить</button>
                </div>
                <div class="comments-list" id="comments-list-${discussion.id}"></div>
            </div>
        `;

        feed.appendChild(discussionEl);

        // Добавляем обработчики событий
        this.attachDiscussionEventListeners(discussionEl, discussion.id);
    }

    attachDiscussionEventListeners(discussionEl, discussionId) {
        discussionEl.querySelector('.like-btn').addEventListener('click', () => {
            this.likeDiscussion(discussionId);
        });

        discussionEl.querySelector('.comment-btn').addEventListener('click', () => {
            this.toggleComments(discussionId);
        });

        const deleteBtn = discussionEl.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteDiscussion(discussionId);
            });
        }

        const addCommentBtn = discussionEl.querySelector('.add-comment-btn');
        if (addCommentBtn) {
            addCommentBtn.addEventListener('click', () => {
                this.addComment(discussionId);
            });
        }

        const commentInput = discussionEl.querySelector(`#comment-input-${discussionId}`);
        if (commentInput) {
            commentInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addComment(discussionId);
                }
            });
        }
    }

    async createPost() {
        if (!this.currentUser) {
            this.showNotification('Войдите в систему чтобы создать обсуждение', 'error');
            return;
        }

        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const file = document.getElementById('postFile').files[0];

        if (!title || !content) {
            this.showNotification('Заполните заголовок и содержание', 'error');
            return;
        }

        try {
            let attachment = null;
            if (file) {
                this.showNotification('Загружаем файл...', 'info');
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

            this.showNotification('Создаем обсуждение...', 'info');
            
            await db.collection('discussions').add({
                title: title,
                content: content,
                authorId: this.currentUser.uid,
                authorName: this.userData.username,
                authorAvatar: this.userData.avatar || '',
                attachment: attachment,
                likes: 0,
                commentCount: 0,
                createdAt: new Date()
            });

            // Очистка формы
            document.getElementById('postTitle').value = '';
            document.getElementById('postContent').value = '';
            document.getElementById('postFile').value = '';

            this.showNotification('Обсуждение создано!', 'success');
            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка создания обсуждения:', error);
            this.showNotification('Ошибка создания обсуждения', 'error');
        }
    }

    async likeDiscussion(discussionId) {
        if (!this.currentUser) {
            this.showNotification('Войдите в систему чтобы оценивать обсуждения', 'error');
            return;
        }

        try {
            await db.collection('discussions').doc(discussionId).update({
                likes: firebase.firestore.FieldValue.increment(1)
            });
            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка оценки обсуждения:', error);
            this.showNotification('Ошибка оценки обсуждения', 'error');
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
                commentsList.innerHTML = '<p class="no-comments">Пока нет комментариев</p>';
                return;
            }

            snapshot.forEach(doc => {
                const comment = doc.data();
                const commentEl = document.createElement('div');
                commentEl.className = 'comment';
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <img src="${comment.authorAvatar || 'https://via.placeholder.com/30'}" 
                             alt="Аватар" class="comment-avatar">
                        <div>
                            <strong class="comment-author">${comment.authorName}</strong>
                            <div class="comment-date">${this.formatDate(comment.createdAt?.toDate?.())}</div>
                        </div>
                    </div>
                    <div class="comment-content">${this.escapeHtml(comment.content)}</div>
                `;
                commentsList.appendChild(commentEl);
            });
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
        }
    }

    async addComment(discussionId) {
        if (!this.currentUser) {
            this.showNotification('Войдите в систему чтобы комментировать', 'error');
            return;
        }

        const commentInput = document.getElementById(`comment-input-${discussionId}`);
        const content = commentInput.value.trim();

        if (!content) {
            this.showNotification('Введите комментарий', 'error');
            return;
        }

        try {
            await db.collection('comments').add({
                discussionId: discussionId,
                content: content,
                authorId: this.currentUser.uid,
                authorName: this.userData.username,
                authorAvatar: this.userData.avatar || '',
                createdAt: new Date()
            });

            // Обновить счетчик комментариев
            await db.collection('discussions').doc(discussionId).update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });

            commentInput.value = '';
            this.loadComments(discussionId);
            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка добавления комментария:', error);
            this.showNotification('Ошибка добавления комментария', 'error');
        }
    }

    async deleteDiscussion(discussionId) {
        if (!confirm('Удалить это обсуждение?')) return;

        try {
            await db.collection('discussions').doc(discussionId).delete();
            
            // Удалить связанные комментарии
            const commentsSnapshot = await db.collection('comments')
                .where('discussionId', '==', discussionId)
                .get();
            
            const batch = db.batch();
            commentsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            this.showNotification('Обсуждение удалено', 'success');
            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка удаления обсуждения:', error);
            this.showNotification('Ошибка удаления обсуждения', 'error');
        }
    }

    // === ПРОФИЛЬ И НАСТРОЙКИ ===
    showProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.style.display = 'block';

        if (this.userData) {
            document.getElementById('profileUsername').value = this.userData.username || '';
            document.getElementById('profileBio').value = this.userData.bio || '';
        }

        document.getElementById('profileForm').onsubmit = (e) => this.updateProfile(e);
    }

    async updateProfile(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const username = document.getElementById('profileUsername').value;
        const bio = document.getElementById('profileBio').value;
        const avatarFile = document.getElementById('profileAvatar').files[0];

        try {
            let avatarURL = null;
            
            if (avatarFile) {
                this.showNotification('Загружаем аватар...', 'info');
                const storageRef = storage.ref();
                const avatarRef = storageRef.child(`avatars/${this.currentUser.uid}`);
                await avatarRef.put(avatarFile);
                avatarURL = await avatarRef.getDownloadURL();
            }

            const updateData = {
                username: username,
                bio: bio
            };

            if (avatarURL) {
                updateData.avatar = avatarURL;
            }

            await db.collection('users').doc(this.currentUser.uid).update(updateData);
            
            document.getElementById('profileModal').style.display = 'none';
            this.showNotification('Профиль обновлен', 'success');
            
            // Обновляем данные
            this.userData = { ...this.userData, ...updateData };
            this.updateUIAfterLogin();
            
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            this.showNotification('Ошибка обновления профиля', 'error');
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'block';

        if (this.userData?.settings) {
            document.getElementById('customCursorToggle').checked = this.userData.settings.customCursor || false;
            document.getElementById('darkModeToggle').checked = this.userData.settings.darkMode || false;
        }

        document.getElementById('customCursorToggle').onchange = (e) => {
            this.updateSetting('customCursor', e.target.checked);
        };

        document.getElementById('darkModeToggle').onchange = (e) => {
            this.updateSetting('darkMode', e.target.checked);
        };
    }

    async updateSetting(key, value) {
        if (!this.currentUser) return;

        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                [`settings.${key}`]: value
            });

            // Обновляем локальные данные
            if (!this.userData.settings) this.userData.settings = {};
            this.userData.settings[key] = value;
            
            // Применяем настройки
            this.applyUserSettings();
            this.showNotification('Настройка сохранена', 'success');
            
        } catch (error) {
            console.error('Ошибка сохранения настройки:', error);
            this.showNotification('Ошибка сохранения настройки', 'error');
        }
    }

    // === АДМИН-ПАНЕЛЬ ===
    showAdminModal() {
        const modal = document.getElementById('adminModal');
        modal.style.display = 'block';
        this.loadAdminData();
    }

    switchAdminTab(tabName) {
        document.querySelectorAll('.admin-content').forEach(content => {
            content.style.display = 'none';
        });
        
        document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).style.display = 'block';
        
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });
    }

    async loadAdminData() {
        await this.loadAdminUsers();
        await this.loadAdminPosts();
    }

    async loadAdminUsers() {
        try {
            const snapshot = await db.collection('users').get();
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '';

            if (snapshot.empty) {
                usersList.innerHTML = '<p>Нет пользователей</p>';
                return;
            }

            snapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userEl = document.createElement('div');
                userEl.className = 'user-item';
                userEl.innerHTML = `
                    <div>
                        <strong>${user.username || user.email}</strong>
                        <div>${user.email} • ${user.role || 'user'}</div>
                    </div>
                    <div class="admin-actions">
                        <button class="btn-small promote-user-btn" data-userid="${user.id}">
                            ${user.role === 'admin' ? '👑 Снять админа' : '⭐ Сделать админом'}
                        </button>
                        <button class="btn-small btn-danger delete-user-btn" data-userid="${user.id}">🗑️ Удалить</button>
                    </div>
                `;
                usersList.appendChild(userEl);
            });

            // Добавляем обработчики
            document.querySelectorAll('.promote-user-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const userId = e.target.getAttribute('data-userid');
                    this.promoteUser(userId);
                });
            });

            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const userId = e.target.getAttribute('data-userid');
                    this.deleteUser(userId);
                });
            });

        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Ошибка загрузки пользователей', 'error');
        }
    }

    async loadAdminPosts() {
        try {
            const snapshot = await db.collection('discussions').orderBy('createdAt', 'desc').get();
            const postsList = document.getElementById('adminPostsList');
            postsList.innerHTML = '';

            if (snapshot.empty) {
                postsList.innerHTML = '<p>Нет постов</p>';
                return;
            }

            snapshot.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                const postEl = document.createElement('div');
                postEl.className = 'post-item';
                postEl.innerHTML = `
                    <div>
                        <strong>${post.title}</strong>
                        <div>Автор: ${post.authorName}</div>
                        <p>${post.content ? post.content.substring(0, 100) + '...' : ''}</p>
                    </div>
                    <button class="btn-small btn-danger delete-post-btn" data-postid="${post.id}">🗑️ Удалить</button>
                `;
                postsList.appendChild(postEl);
            });

            document.querySelectorAll('.delete-post-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const postId = e.target.getAttribute('data-postid');
                    this.adminDeletePost(postId);
                });
            });

        } catch (error) {
            console.error('Error loading posts:', error);
            this.showNotification('Ошибка загрузки постов', 'error');
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

            this.showNotification(`Пользователь ${newRole === 'admin' ? 'повышен до админа' : 'понижен'}`, 'success');
            this.loadAdminUsers();
        } catch (error) {
            this.showNotification('Ошибка изменения роли', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Удалить пользователя? Это действие нельзя отменить!')) return;

        try {
            await db.collection('users').doc(userId).delete();
            this.showNotification('Пользователь удален', 'success');
            this.loadAdminUsers();
        } catch (error) {
            this.showNotification('Ошибка удаления пользователя', 'error');
        }
    }

    async adminDeletePost(postId) {
        if (!confirm('Удалить этот пост?')) return;

        try {
            await this.deleteDiscussion(postId);
            this.loadAdminPosts();
        } catch (error) {
            this.showNotification('Ошибка удаления поста', 'error');
        }
    }

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    showWelcomeScreen() {
        const feed = document.getElementById('discussionsFeed');
        feed.innerHTML = `
            <div class="welcome-message">
                <h2>Добро пожаловать в VibeHive 2025</h2>
                <p>Делитесь кодом, идеями и присоединяйтесь к обсуждениям с сообществом</p>
                <p>Войдите в систему чтобы начать общаться!</p>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 500;
        `;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    getErrorMessage(error) {
        const errorMessages = {
            'auth/invalid-email': 'Неверный формат email',
            'auth/user-disabled': 'Аккаунт отключен',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/email-already-in-use': 'Email уже используется',
            'auth/weak-password': 'Пароль слишком слабый',
            'auth/network-request-failed': 'Ошибка сети'
        };
        
        return errorMessages[error.code] || error.message;
    }

    formatContent(content) {
        if (!content) return '';
        return this.escapeHtml(content)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        if (!date) return '';
        try {
            const now = new Date();
            const diff = now - new Date(date);
            
            if (diff < 60000) return 'только что';
            if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн. назад`;
            
            return new Date(date).toLocaleDateString('ru-RU');
        } catch (error) {
            return '';
        }
    }

    searchDiscussions(query) {
        const discussions = document.querySelectorAll('.discussion');
        const lowerQuery = query.toLowerCase();
        
        discussions.forEach(discussion => {
            const title = discussion.querySelector('.discussion-title').textContent.toLowerCase();
            const content = discussion.querySelector('.discussion-content').textContent.toLowerCase();
            const author = discussion.querySelector('.discussion-author').textContent.toLowerCase();
            
            if (title.includes(lowerQuery) || content.includes(lowerQuery) || author.includes(lowerQuery)) {
                discussion.style.display = 'block';
            } else {
                discussion.style.display = 'none';
            }
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    window.app = new VibeHiveApp();
});