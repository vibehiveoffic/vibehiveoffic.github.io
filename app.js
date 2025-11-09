// Глобальная переменная для приложения
let app;

class VibeHiveApp {
    constructor() {
        this.currentUser = null;
        this.discussions = [];
        this.init();
    }

    init() {
        console.log("Инициализация приложения VibeHive");
        this.setupEventListeners();
        this.setupCustomCursor();
        
        // Проверяем, авторизован ли пользователь
        if (auth.currentUser) {
            this.currentUser = auth.currentUser;
            this.loadDiscussions();
        }
        
        // Слушаем изменения аутентификации
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.loadDiscussions();
            }
        });
    }

    setupEventListeners() {
        console.log("Настройка обработчиков приложения");
        
        // Создание поста
        document.getElementById('submitPost').addEventListener('click', () => this.createPost());

        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchDiscussions(e.target.value);
        });

        // Обработка нажатия Enter в поле поиска
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchDiscussions(e.target.value);
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

    async loadDiscussions() {
        try {
            const snapshot = await db.collection('discussions')
                .orderBy('createdAt', 'desc')
                .limit(50)
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
                const discussion = { id: doc.id, ...doc.data() };
                this.discussions.push(discussion);
                this.renderDiscussion(discussion);
            });
        } catch (error) {
            console.error('Ошибка загрузки обсуждений:', error);
            if (authSystem) {
                authSystem.showNotification('Ошибка загрузки обсуждений', 'error');
            }
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

        // Добавить обработчики событий
        this.attachDiscussionEventListeners(discussionEl, discussion.id);
    }

    attachDiscussionEventListeners(discussionEl, discussionId) {
        // Лайк
        discussionEl.querySelector('.like-btn').addEventListener('click', () => {
            this.likeDiscussion(discussionId);
        });

        // Комментарии
        discussionEl.querySelector('.comment-btn').addEventListener('click', () => {
            this.toggleComments(discussionId);
        });

        // Удаление
        const deleteBtn = discussionEl.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteDiscussion(discussionId);
            });
        }

        // Добавление комментария
        const addCommentBtn = discussionEl.querySelector('.add-comment-btn');
        if (addCommentBtn) {
            addCommentBtn.addEventListener('click', () => {
                this.addComment(discussionId);
            });
        }

        // Enter для комментария
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
            if (authSystem) {
                authSystem.showNotification('Войдите в систему чтобы создать обсуждение', 'error');
            }
            return;
        }

        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const file = document.getElementById('postFile').files[0];

        if (!title || !content) {
            if (authSystem) {
                authSystem.showNotification('Заполните заголовок и содержание', 'error');
            }
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            const userData = userDoc.data();

            let attachment = null;
            if (file) {
                // Загрузка файла
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

            // Создание обсуждения
            await db.collection('discussions').add({
                title: title,
                content: content,
                authorId: this.currentUser.uid,
                authorName: userData.username || this.currentUser.email,
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

            if (authSystem) {
                authSystem.showNotification('Обсуждение создано!', 'success');
            }
            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка создания обсуждения:', error);
            if (authSystem) {
                authSystem.showNotification('Ошибка создания обсуждения: ' + error.message, 'error');
            }
        }
    }

    async likeDiscussion(discussionId) {
        if (!this.currentUser) {
            if (authSystem) {
                authSystem.showNotification('Войдите в систему чтобы оценивать обсуждения', 'error');
            }
            return;
        }

        try {
            await db.collection('discussions').doc(discussionId).update({
                likes: firebase.firestore.FieldValue.increment(1)
            });

            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка оценки обсуждения:', error);
            if (authSystem) {
                authSystem.showNotification('Ошибка оценки обсуждения', 'error');
            }
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
                            <div class="comment-date">${this.formatDate(comment.createdAt)}</div>
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
            if (authSystem) {
                authSystem.showNotification('Войдите в систему чтобы комментировать', 'error');
            }
            return;
        }

        const commentInput = document.getElementById(`comment-input-${discussionId}`);
        const content = commentInput.value.trim();

        if (!content) {
            if (authSystem) {
                authSystem.showNotification('Введите комментарий', 'error');
            }
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            const userData = userDoc.data();

            // Добавить комментарий
            await db.collection('comments').add({
                discussionId: discussionId,
                content: content,
                authorId: this.currentUser.uid,
                authorName: userData.username || this.currentUser.email,
                authorAvatar: userData.avatar || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Обновить счетчик комментариев
            await db.collection('discussions').doc(discussionId).update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });

            commentInput.value = '';
            this.loadComments(discussionId);
            this.loadDiscussions(); // Обновить счетчики
        } catch (error) {
            console.error('Ошибка добавления комментария:', error);
            if (authSystem) {
                authSystem.showNotification('Ошибка добавления комментария', 'error');
            }
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

            if (authSystem) {
                authSystem.showNotification('Обсуждение удалено', 'success');
            }
            this.loadDiscussions();
        } catch (error) {
            console.error('Ошибка удаления обсуждения:', error);
            if (authSystem) {
                authSystem.showNotification('Ошибка удаления обсуждения', 'error');
            }
        }
    }

    formatContent(content) {
        if (!content) return '';
        // Простое форматирование
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

    formatDate(timestamp) {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate();
            const now = new Date();
            const diff = now - date;
            
            // Относительное время
            if (diff < 60000) return 'только что';
            if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн. назад`;
            
            return date.toLocaleDateString('ru-RU');
        } catch (error) {
            return '';
        }
    }

    searchDiscussions(query) {
        const discussions = document.querySelectorAll('.discussion');
        const lowerQuery = query.toLowerCase();
        
        let found = false;
        discussions.forEach(discussion => {
            const title = discussion.querySelector('.discussion-title').textContent.toLowerCase();
            const content = discussion.querySelector('.discussion-content').textContent.toLowerCase();
            const author = discussion.querySelector('.discussion-author').textContent.toLowerCase();
            
            if (title.includes(lowerQuery) || content.includes(lowerQuery) || author.includes(lowerQuery)) {
                discussion.style.display = 'block';
                found = true;
            } else {
                discussion.style.display = 'none';
            }
        });

        // Если ничего не найдено
        if (!found && query.length > 0) {
            const feed = document.getElementById('discussionsFeed');
            const noResults = document.createElement('div');
            noResults.className = 'welcome-message';
            noResults.innerHTML = `<p>По запросу "${query}" ничего не найдено</p>`;
            feed.appendChild(noResults);
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    app = new VibeHiveApp();
    console.log("Приложение VibeHive инициализировано");
});