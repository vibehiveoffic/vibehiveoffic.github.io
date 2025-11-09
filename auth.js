// Глобальная переменная для системы аутентификации
let authSystem;

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log("Инициализация системы аутентификации");
        
        // Слушатель состояния аутентификации
        auth.onAuthStateChanged((user) => {
            console.log('Состояние аутентификации изменено:', user);
            if (user) {
                this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log("Настройка обработчиков событий");
        
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
        document.querySelectorAll('.auth-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAuthTab(tabName);
            });
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Меню пользователя
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

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

        // Восстановление пароля
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
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
        document.querySelectorAll('.auth-tabs .tab-btn').forEach(tab => {
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

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

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

    async handleForgotPassword() {
        const email = prompt('Введите ваш email для восстановления пароля:');
        if (!email) return;

        try {
            await auth.sendPasswordResetEmail(email);
            this.showNotification('Письмо для восстановления пароля отправлено на вашу почту', 'success');
        } catch (error) {
            this.showNotification(this.getErrorMessage(error), 'error');
        }
    }

    async handleUserLogin(user) {
        console.log('Пользователь вошел:', user);
        this.currentUser = user;
        
        try {
            // Получение данных пользователя
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            let userData;
            if (!userDoc.exists) {
                console.log('Документ пользователя не найден, создаем...');
                // Создаем документ если не существует
                userData = {
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
                };
                await db.collection('users').doc(user.uid).set(userData);
            } else {
                userData = userDoc.data();
            }

            // Обновление UI
            this.updateUIAfterLogin(user, userData);
            
            // Загрузка обсуждений
            if (window.app) {
                window.app.loadDiscussions();
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
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
        console.log('Пользователь вышел');
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
                        <small>Создан: ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}</small>
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

            // Добавляем обработчики для кнопок
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
                        <div>Автор: ${post.authorName} • ${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
                        <p>${post.content ? post.content.substring(0, 100) + '...' : ''}</p>
                    </div>
                    <button class="btn-small btn-danger delete-post-btn" data-postid="${post.id}">🗑️ Удалить</button>
                `;
                postsList.appendChild(postEl);
            });

            // Добавляем обработчики для кнопок удаления постов
            document.querySelectorAll('.delete-post-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const postId = e.target.getAttribute('data-postid');
                    this.deletePost(postId);
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

// Инициализация системы аутентификации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
    console.log("Система аутентификации инициализирована");
});