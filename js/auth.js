// Авторизация и регистрация с Firebase

function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value.trim();
    
    try {
        // Проверка уникальности никнейма
        const usernameCheck = await database.ref('usernames/' + username).once('value');
        if (usernameCheck.exists()) {
            alert('Пользователь с таким никнеймом уже существует');
            return;
        }
        
        // Создание пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Сохранение данных пользователя в Realtime Database
        await database.ref('users/' + user.uid).set({
            username: username,
            email: email,
            fullName: fullName,
            bio: '',
            city: '',
            birthday: '',
            createdAt: new Date().toISOString()
        });
        
        // Резервирование никнейма
        await database.ref('usernames/' + username).set(user.uid);
        
        alert('Регистрация успешна! Теперь войдите в систему.');
        showLogin();
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка регистрации: ' + error.message);
    }
}

async function login(event) {
    event.preventDefault();
    
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        let email = usernameOrEmail;
        
        // Если введен никнейм, получаем email
        if (!usernameOrEmail.includes('@')) {
            const uidSnapshot = await database.ref('usernames/' + usernameOrEmail).once('value');
            if (!uidSnapshot.exists()) {
                alert('Пользователь не найден');
                return;
            }
            const uid = uidSnapshot.val();
            const userSnapshot = await database.ref('users/' + uid).once('value');
            email = userSnapshot.val().email;
        }
        
        // Вход через Firebase Auth
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'home.html';
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Неверный логин или пароль');
    }
}

// Проверка авторизации на главной странице
auth.onAuthStateChanged((user) => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        if (user) {
            window.location.href = 'home.html';
        }
    }
});
