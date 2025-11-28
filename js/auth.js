// Авторизация и регистрация

function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value.trim();
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.find(u => u.username === username)) {
        alert('Пользователь с таким никнеймом уже существует');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        alert('Пользователь с таким email уже существует');
        return;
    }
    
    const newUser = {
        username,
        email,
        password,
        fullName,
        bio: '',
        city: '',
        birthday: '',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('Регистрация успешна! Теперь войдите в систему.');
    showLogin();
}

function login(event) {
    event.preventDefault();
    
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    const user = users.find(u => 
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
        u.password === password
    );
    
    if (user) {
        localStorage.setItem('currentUser', user.username);
        window.location.href = 'home.html';
    } else {
        alert('Неверный логин или пароль');
    }
}

// Проверка авторизации на главной странице
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'home.html';
    }
}
