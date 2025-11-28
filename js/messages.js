// Сообщения и чаты с Firebase

let currentChatId = null;
let callInterval = null;
let messagesListener = null;

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const snapshot = await database.ref('users/' + user.uid).once('value');
    currentUserData = snapshot.val();
    currentUserData.uid = user.uid;
    
    loadChats();
    
    const urlParams = new URLSearchParams(window.location.search);
    const chatParam = urlParams.get('chat');
    if (chatParam) {
        openChat(chatParam);
    }
});

async function loadChats() {
    if (!currentUserData) return;
    
    const chatsSnapshot = await database.ref('chats').once('value');
    const chatsList = document.getElementById('chatsList');
    const userChats = [];
    
    chatsSnapshot.forEach((child) => {
        const chat = child.val();
        chat.id = child.key;
        if (chat.participants && chat.participants[currentUserData.uid]) {
            userChats.push(chat);
        }
    });
    
    if (userChats.length === 0) {
        chatsList.innerHTML = '<p style="color: #666;">Нет чатов</p>';
        return;
    }
    
    // Получаем данные других пользователей
    const usersPromises = userChats.map(async (chat) => {
        const otherUid = Object.keys(chat.participants).find(uid => uid !== currentUserData.uid);
        const userSnapshot = await database.ref('users/' + otherUid).once('value');
        return { chat, otherUser: userSnapshot.val() };
    });
    
    const chatsWithUsers = await Promise.all(usersPromises);
    
    chatsList.innerHTML = chatsWithUsers.map(({ chat, otherUser }) => {
        const lastMessage = chat.lastMessage || { text: 'Нет сообщений' };
        return `
            <div class="chat-item ${currentChatId === chat.id ? 'active' : ''}" onclick="openChat('${chat.id}')">
                <strong>${otherUser ? otherUser.fullName : 'Пользователь'}</strong>
                <span>${lastMessage.text.substring(0, 30)}${lastMessage.text.length > 30 ? '...' : ''}</span>
            </div>
        `;
    }).join('');
}

async function openChat(chatId) {
    currentChatId = chatId;
    
    const chatSnapshot = await database.ref('chats/' + chatId).once('value');
    const chat = chatSnapshot.val();
    
    if (!chat) return;
    
    const otherUid = Object.keys(chat.participants).find(uid => uid !== currentUserData.uid);
    const otherUserSnapshot = await database.ref('users/' + otherUid).once('value');
    const otherUser = otherUserSnapshot.val();
    
    document.getElementById('chatHeader').innerHTML = `
        <strong>${otherUser ? otherUser.fullName : 'Пользователь'}</strong>
        <span style="color: #667eea; margin-left: 10px;">@${otherUser ? otherUser.username : ''}</span>
    `;
    
    document.getElementById('messageInput').classList.remove('hidden');
    
    // Отключаем предыдущий слушатель
    if (messagesListener) {
        database.ref('chats/' + currentChatId + '/messages').off('value', messagesListener);
    }
    
    // Слушаем сообщения в реальном времени
    messagesListener = database.ref('chats/' + chatId + '/messages').on('value', (snapshot) => {
        const messages = [];
        snapshot.forEach((child) => {
            messages.push(child.val());
        });
        displayMessages(messages);
    });
    
    loadChats();
}

function displayMessages(messages) {
    const messagesArea = document.getElementById('messagesArea');
    
    messagesArea.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender === currentUserData.uid ? 'sent' : 'received'}">
            <div>${msg.text}</div>
            <div class="message-time">${formatDate(msg.timestamp)}</div>
        </div>
    `).join('');
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

async function sendMessage() {
    if (!currentChatId) return;
    
    const input = document.getElementById('newMessage');
    const text = input.value.trim();
    
    if (!text) return;
    
    const messageData = {
        sender: currentUserData.uid,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    // Добавляем сообщение
    await database.ref('chats/' + currentChatId + '/messages').push(messageData);
    
    // Обновляем последнее сообщение
    await database.ref('chats/' + currentChatId + '/lastMessage').set(messageData);
    
    input.value = '';
}

document.getElementById('newMessage')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function startCall() {
    if (!currentChatId) return;
    
    const chatSnapshot = await database.ref('chats/' + currentChatId).once('value');
    const chat = chatSnapshot.val();
    
    const otherUid = Object.keys(chat.participants).find(uid => uid !== currentUserData.uid);
    const otherUserSnapshot = await database.ref('users/' + otherUid).once('value');
    const otherUser = otherUserSnapshot.val();
    
    document.getElementById('callUser').textContent = `Звонок: ${otherUser.fullName}`;
    document.getElementById('callStatus').textContent = 'Соединение...';
    document.getElementById('callModal').classList.remove('hidden');
    
    let seconds = 0;
    setTimeout(() => {
        document.getElementById('callStatus').textContent = 'Идет звонок';
        callInterval = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            document.getElementById('callStatus').textContent = 
                `Идет звонок ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    }, 2000);
}

function endCall() {
    if (callInterval) {
        clearInterval(callInterval);
        callInterval = null;
    }
    document.getElementById('callModal').classList.add('hidden');
}
