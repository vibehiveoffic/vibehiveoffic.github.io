class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        // Слушатель состояния аутентификации
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user);
            if (user) {
                this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
        });
    }

    setupEventListeners() {
        // Кнопки входа/регистрации
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('registerBtn').addEventListener('click', () => this.showAuthModal('register'));
        
        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Переключение вкладок аутентификации
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAuthTab(tabName);
            });
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
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

        // Закрытие модальных окон при клике вне
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    showAuthModal(defaultTab = 'login') {
        const modal = document.getElementById('authModal');
        modal.style.display = 'block';
        this.switchAuthTab(defaultTab);
        
        // Очистка форм
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
    }

    switchAuthTab(tabName) {
        // Обновление активных вкладок
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Показать/скрыть формы
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            this.showNotification('Входим...', 'info');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
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

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            this.showNotification('Регистрируем...', 'info');
            
            // Создание пользователя
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Отправка email подтверждения
            await user.sendEmailVerification();

            // Создание профиля в Firestore
            await db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user',
                bio: '',
                avatar: '',
                settings: {
                    customCursor: false,
                    darkMode: false
                }
            });

            document.getElementById('authModal').style.display = 'none';
            this.showNotification('Регистрация успешна! Проверьте email для подтверждения.', 'success');
            
        } catch (error) {
            this.showNotification(this.getErrorMessage(error), 'error');
        }
    }

    async handleUserLogin(user) {
        console.log('User logged in:', user);
        this.currentUser = user;
        
        try {
            // Получение данных пользователя
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                console.log('User document not found, creating...');
                // Создаем документ если не существует
                await db.collection('users').doc(user.uid).set({
                    username: user.email.split('@')[0],
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'user',
                    bio: '',
                    avatar: '',
                    settings: {
                        customCursor: false,
                        darkMode: false
                    }
                });
            }

            const userData = userDoc.exists ? userDoc.data() : {
                username: user.email.split('@')[0],
                email: user.email,
                role: 'user'
            };

            // Обновление UI
            this.updateUIAfterLogin(user, userData);
            
            // Загрузка обсуждений
            if (window.app) {
                window.app.loadDiscussions();
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Ошибка загрузки данных пользователя', 'error');
        }
    }

    updateUIAfterLogin(user, userData) {
        // Показать элементы для авторизованных пользователей
        document.getElementById('navActions').style.display = 'none';
        document.getElementById('userMenu').style.display = 'flex';
        document.getElementById('createPost').style.display = 'block';
        
        // Обновление информации пользователя
        document.getElementById('userName').textContent = userData.username || user.email;
        
        if (userData.avatar) {
            document.getElementById('userAvatar').src = userData.avatar;
        }

        // Показать кнопку админа если пользователь администратор
        if (userData.role === 'admin') {
            document.getElementById('adminBtn').style.display = 'block';
        }

        // Применить настройки
        this.applyUserSettings(userData.settings || {});
    }

    handleUserLogout() {
        this.currentUser = null;
        
        // Сброс UI
        document.getElementById('navActions').style.display = 'flex';
        document.getElementById('userMenu').style.display = 'none';
        document.getElementById('createPost').style.display = 'none';
        document.getElementById('adminBtn').style.display = 'none';
        
        // Показать приветственное сообщение
        document.getElementById('discussionsFeed').innerHTML = `
            <div class="welcome-message">
                <h2>Добро пожаловать в VibeHive 2025</h2>
                <p>Делитесь кодом, идеями и присоединяйтесь к обсуждениям с сообществом</p>
                <p>Войдите в систему чтобы начать общаться!</p>
            </div>
        `;
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.showNotification('Вы вышли из системы', 'success');
        } catch (error) {
            this.showNotification('Ошибка при выходе', 'error');
        }
    }

    applyUserSettings(settings) {
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

    showProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.style.display = 'block';

        // Загрузка текущих данных
        if (this.currentUser) {
            db.collection('users').doc(this.currentUser.uid).get().then(doc => {
                const userData = doc.data();
                document.getElementById('profileUsername').value = userData.username || '';
                document.getElementById('profileBio').value = userData.bio || '';
            });
        }

        // Обработчик формы
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
                // Загрузка аватара
                const storageRef = storage.ref();
                const avatarRef = storageRef.child(`avatars/${this.currentUser.uid}`);
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

            await db.collection('users').doc(this.currentUser.uid).update(updateData);
            
            document.getElementById('profileModal').style.display = 'none';
            this.showNotification('Профиль обновлен', 'success');
            
            // Обновление UI
            this.handleUserLogin(this.currentUser);
            
        } catch (error) {
            this.showNotification('Ошибка обновления профиля: ' + error.message, 'error');
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'block';

        // Загрузка текущих настроек
        if (this.currentUser) {
            db.collection('users').doc(this.currentUser.uid).get().then(doc => {
                const userData = doc.data();
                const settings = userData.settings || {};
                
                document.getElementById('customCursorToggle').checked = settings.customCursor || false;
                document.getElementById('darkModeToggle').checked = settings.darkMode || false;
            });
        }

        // Обработчики изменений
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

            // Применить настройки сразу
            this.applyUserSettings({ [key]: value });
            this.showNotification('Настройка сохранена', 'success');
            
        } catch (error) {
            this.showNotification('Ошибка сохранения настройки', 'error');
        }
    }

    showAdminModal() {
        const modal = document.getElementById('adminModal');
        modal.style.display = 'block';
        
        // Обработчики вкладок админки
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAdminTab(tabName);
            });
        });

        this.loadAdminData();
    }

    switchAdminTab(tabName) {
        // Скрыть все вкладки
        document.querySelectorAll('.admin-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Показать выбранную
        document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).style.display = 'block';
        
        // Обновить активные кнопки
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

            snapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userEl = document.createElement('div');
                userEl.className = 'user-item';
                userEl.innerHTML = `
                    <div>
                        <strong>${user.username || user.email}</strong>
                        <div>${user.email} • ${user.role || 'user'}</div>
                        <small>Создан: ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}</small>
                    </div>
                    <div class="admin-actions">
                        <button class="btn-small" onclick="authSystem.promoteUser('${user.id}')">
                            ${user.role === 'admin' ? '👑 Снять админа' : '⭐ Сделать админом'}
                        </button>
                        <button class="btn-small btn-danger" onclick="authSystem.deleteUser('${user.id}')">🗑️ Удалить</button>
                    </div>
                `;
                usersList.appendChild(userEl);
            });
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadAdminPosts() {
        try {
            const snapshot = await db.collection('discussions').orderBy('createdAt', 'desc').get();
            const postsList = document.getElementById('adminPostsList');
            postsList.innerHTML = '';

            snapshot.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                const postEl = document.createElement('div');
                postEl.className = 'post-item';
                postEl.innerHTML = `
                    <div>
                        <strong>${post.title}</strong>
                        <div>Автор: ${post.authorName} • ${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
                        <p>${post.content.substring(0, 100)}...</p>
                    </div>
                    <button class="btn-small btn-danger" onclick="authSystem.deletePost('${post.id}')">🗑️ Удалить</button>
                `;
                postsList.appendChild(postEl);
            });
        } catch (error) {
            console.error('Error loading posts:', error);
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
            // Удалить пользователя из Authentication
            // await auth.deleteUser(userId); // Требуются права администратора
            
            // Удалить из Firestore
            await db.collection('users').doc(userId).delete();
            
            this.showNotification('Пользователь удален', 'success');
            this.loadAdminUsers();
        } catch (error) {
            this.showNotification('Ошибка удаления пользователя', 'error');
        }
    }

    async deletePost(postId) {
        if (!confirm('Удалить этот пост?')) return;

        try {
            await db.collection('discussions').doc(postId).delete();
            this.showNotification('Пост удален', 'success');
            this.loadAdminPosts();
            
            // Обновить ленту если приложение загружено
            if (window.app) {
                window.app.loadDiscussions();
            }
        } catch (error) {
            this.showNotification('Ошибка удаления поста', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Создать уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Добавить в DOM
        document.body.appendChild(notification);
        
        // Удалить через 3 секунды
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
}

// Инициализация системы аутентификации
const authSystem = new AuthSystem();