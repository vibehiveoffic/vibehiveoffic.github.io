class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Слушатель изменений состояния аутентификации
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Модальное окно аутентификации
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal());
        document.getElementById('registerBtn').addEventListener('click', () => this.showAuthModal('register'));
        
        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAuthTab(tabName);
            });
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Восстановление пароля
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
    }

    showAuthModal(defaultTab = 'login') {
        const modal = document.getElementById('authModal');
        modal.style.display = 'block';
        this.switchAuthTab(defaultTab);
    }

    switchAuthTab(tabName) {
        // Обновление вкладок
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Обновление форм
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
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

        try {
            // Создание учетной записи пользователя
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Отправка email для верификации
            await user.sendEmailVerification();

            // Создание профиля пользователя в Firestore
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
            this.showNotification('Регистрация успешна! Пожалуйста, проверьте вашу почту для подтверждения.', 'success');
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
        this.currentUser = user;
        
        // Получение данных пользователя из Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        // Обновление UI
        document.getElementById('navActions').style.display = 'none';
        document.getElementById('userMenu').style.display = 'flex';
        document.getElementById('createPost').style.display = 'block';
        
        document.getElementById('userName').textContent = userData.username || user.email;
        
        if (userData.avatar) {
            document.getElementById('userAvatar').src = userData.avatar;
        } else {
            document.getElementById('userAvatar').src = 'https://via.placeholder.com/40';
        }

        // Показ кнопки администратора если пользователь админ
        if (userData.role === 'admin') {
            document.getElementById('adminBtn').style.display = 'block';
        }

        // Применение настроек пользователя
        this.applyUserSettings(userData.settings);

        // Загрузка обсуждений
        app.loadDiscussions();
    }

    handleUserLogout() {
        this.currentUser = null;
        
        document.getElementById('navActions').style.display = 'flex';
        document.getElementById('userMenu').style.display = 'none';
        document.getElementById('createPost').style.display = 'none';
        document.getElementById('adminBtn').style.display = 'none';
        
        document.getElementById('discussionsFeed').innerHTML = `
            <div class="welcome-message">
                <h2>Добро пожаловать в VibeHive 2025</h2>
                <p>Делитесь кодом, идеями и присоединяйтесь к обсуждениям с сообществом</p>
            </div>
        `;
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.showNotification('Успешный выход!', 'success');
        } catch (error) {
            this.showNotification(this.getErrorMessage(error), 'error');
        }
    }

    applyUserSettings(settings) {
        if (settings.customCursor) {
            document.body.classList.add('custom-cursor-enabled');
        } else {
            document.body.classList.remove('custom-cursor-enabled');
        }

        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    showNotification(message, type = 'info') {
        // Создание элемента уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Удаление через 3 секунды
        setTimeout(() => {
            notification.remove();
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