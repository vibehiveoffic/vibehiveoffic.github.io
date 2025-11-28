// Сообщения и чаты

checkAuth();

let currentChatId = null;
let callInterval = null;

loadChats();

const urlParams = new URLSearchParams(window.location.search);
const chatParam = urlParams.get('chat');
if (chatParam) {
    openChat(chatParam);
}

function loadChats() {
    const currentUser = getCurrentUser();
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const users = getAllUsers();
    
    const userChats = chats.filter(c => c.participants.includes(currentUser.username));
    
    const chatsList = document.getElementById('chatsList');
    
    if (userChats.length === 0) {
        chatsList.innerHTML = '<p style="color: #666;">Нет чатов</p>';
        return;
    }
    
    chatsList.innerHTML = userChats.map(chat => {
        const otherUsername = chat.participants.find(p => p !== currentUser.username);
        const otherUser = users.find(u => u.username === otherUsername);
        const lastMessage = chat.messages[chat.messages.length - 1];
        
        return `
            <div class="chat-item ${currentChatId === chat.id ? 'active' : ''}" onclick="openChat('${chat.id}')">
                <strong>${otherUser ? otherUser.fullName : otherUsername}</strong>
                <span>${lastMessage ? lastMessage.text.substring(0, 30) + '...' : 'Нет сообщений'}</span>
            </div>
        `;
    }).join('');
}

function openChat(chatId) {
    currentChatId = chatId;
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return;
    
    const currentUser = getCurrentUser();
    const users = getAllUsers();
    const otherUsername = chat.participants.find(p => p !== currentUser.username);
    const otherUser = users.find(u => u.username === otherUsername);
    
    document.getElementById('chatHeader').innerHTML = `
        <strong>${otherUser ? otherUser.fullName : otherUsername}</strong>
        <span style="color: #667eea; margin-left: 10px;">@${otherUsername}</span>
    `;
    
    document.getElementById('messageInput').classList.remove('hidden');
    
    loadMessages();
    loadChats();
}

function loadMessages() {
    if (!currentChatId) return;
    
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === currentChatId);
    
    if (!chat) return;
    
    const currentUser = getCurrentUser();
    const messagesArea = document.getElementById('messagesArea');
    
    messagesArea.innerHTML = chat.messages.map(msg => `
        <div class="message ${msg.sender === currentUser.username ? 'sent' : 'received'}">
            <div>${msg.text}</div>
            <div class="message-time">${formatDate(msg.timestamp)}</div>
        </div>
    `).join('');
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function sendMessage() {
    if (!currentChatId) return;
    
    const input = document.getElementById('newMessage');
    const text = input.value.trim();
    
    if (!text) return;
    
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === currentChatId);
    
    if (!chat) return;
    
    const currentUser = getCurrentUser();
    
    chat.messages.push({
        sender: currentUser.username,
        text: text,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('chats', JSON.stringify(chats));
    
    input.value = '';
    loadMessages();
    loadChats();
}

document.getElementById('newMessage')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function startCall() {
    if (!currentChatId) return;
    
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === currentChatId);
    const currentUser = getCurrentUser();
    const users = getAllUsers();
    
    const otherUsername = chat.participants.find(p => p !== currentUser.username);
    const otherUser = users.find(u => u.username === otherUsername);
    
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
