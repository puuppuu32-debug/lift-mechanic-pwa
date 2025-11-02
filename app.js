// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDQd5RZyQAyOoI6Qzu6aCuQOxWSUQOVOxM",
    authDomain: "lift-mechanic-pwa.firebaseapp.com",
    projectId: "lift-mechanic-pwa",
    storageBucket: "lift-mechanic-pwa.firebasestorage.app",
    messagingSenderId: "504828099853",
    appId: "1:504828099853:web:6af96c6d3c79afa0930444",
    measurementId: "G-T5J495YEL8"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Глобальные переменные
let currentUser = null;
let userDocuments = [];

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Слушатель изменения состояния аутентификации
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // Пользователь вошел
            currentUser = user;
            showMainMenu();
            loadUserData();
            showNotification(`Добро пожаловать, ${user.email}!`);
        } else {
            // Пользователь вышел
            currentUser = null;
            userDocuments = [];
            showLoginScreen();
        }
    });

    setupEventListeners();
    initNewFeatures();
}

function setupEventListeners() {
    // Форма входа
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Кнопка регистрации
    document.getElementById('registerBtn').addEventListener('click', function() {
        handleRegister();
    });
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Кнопки меню
    document.getElementById('tasksBtn').addEventListener('click', function() {
        showModal('tasksModal');
    });
    
    document.getElementById('literatureBtn').addEventListener('click', function() {
        showModal('literatureModal');
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });
    
    // Закрытие по клику вне окна
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

function initNewFeatures() {
    setupTasksFunctionality();
    setupLiteratureFunctionality();
}

// Аутентификация - ВХОД
async function handleLogin() {
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const authStatus = document.getElementById('authStatus');
    
    if (!email || !password) {
        showNotification('Заполните все поля');
        return;
    }

    authStatus.textContent = 'Вход...';
    authStatus.style.color = 'white';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Успешный вход обрабатывается в onAuthStateChanged
    } catch (error) {
        console.log('Ошибка входа:', error.code);
        
        if (error.code === 'auth/invalid-login-credentials') {
            authStatus.textContent = 'Неверный email или пароль';
        } else if (error.code === 'auth/user-not-found') {
            authStatus.textContent = 'Пользователь не найден. Зарегистрируйтесь.';
        } else if (error.code === 'auth/wrong-password') {
            authStatus.textContent = 'Неверный пароль';
        } else {
            authStatus.textContent = 'Ошибка входа: ' + error.message;
        }
        authStatus.style.color = '#e74c3c';
    }
}

// Аутентификация - РЕГИСТРАЦИЯ
async function handleRegister() {
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const authStatus = document.getElementById('authStatus');
    
    if (!email || !password) {
        showNotification('Заполните все поля');
        return;
    }

    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        authStatus.textContent = 'Введите корректный email';
        authStatus.style.color = '#e74c3c';
        return;
    }

    // Проверка пароля
    if (password.length < 6) {
        authStatus.textContent = 'Пароль должен быть не менее 6 символов';
        authStatus.style.color = '#e74c3c';
        return;
    }

    authStatus.textContent = 'Регистрация...';
    authStatus.style.color = 'white';

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        showNotification('Аккаунт успешно создан!');
        // Успешная регистрация автоматически выполняет вход
    } catch (error) {
        console.log('Ошибка регистрации:', error.code);
        
        if (error.code === 'auth/email-already-in-use') {
            authStatus.textContent = 'Этот email уже зарегистрирован. Войдите в систему.';
        } else if (error.code === 'auth/invalid-email') {
            authStatus.textContent = 'Неверный формат email';
        } else if (error.code === 'auth/weak-password') {
            authStatus.textContent = 'Пароль слишком слабый';
        } else {
            authStatus.textContent = 'Ошибка регистрации: ' + error.message;
        }
        authStatus.style.color = '#e74c3c';
    }
}

function handleLogout() {
    auth.signOut();
    showNotification('Вы вышли из системы');
}

// Загрузка пользовательских данных
async function loadUserData() {
    if (!currentUser) return;

    document.getElementById('userEmail').textContent = currentUser.email;
    await loadUserDocuments();
}

// Функции для работы с заданиями
function setupTasksFunctionality() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterTasks(filter);
        });
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-task')) {
            const taskItem = e.target.closest('.task-item');
            const taskTitle = taskItem.querySelector('h3').textContent;
            
            if (e.target.classList.contains('accept')) {
                updateTaskStatus(taskItem, 'in-progress');
                showNotification(`Задание "${taskTitle}" принято в работу`);
            } else if (e.target.classList.contains('reject')) {
                const reason = prompt('Укажите причину отказа:');
                if (reason !== null) {
                    updateTaskStatus(taskItem, 'rejected');
                    showNotification(`Отказ от задания "${taskTitle}". Причина: ${reason}`);
                }
            } else if (e.target.classList.contains('complete')) {
                updateTaskStatus(taskItem, 'completed');
                showNotification(`Задание "${taskTitle}" завершено`);
            } else if (e.target.classList.contains('reset')) {
                updateTaskStatus(taskItem, 'new');
                showNotification(`Статус задания "${taskTitle}" сброшен`);
            }
        }
    });
}

// Функции для работы с литературой
function setupLiteratureFunctionality() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    document.getElementById('addDocForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addUserDocument();
    });
    
    document.getElementById('clearDocsBtn').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите удалить все ваши документы?')) {
            clearUserDocuments();
        }
    });
    
    document.getElementById('searchDocs').addEventListener('input', function(e) {
        searchDocuments(e.target.value);
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-delete')) {
            const docItem = e.target.closest('li');
            const docId = docItem.getAttribute('data-doc-id');
            deleteUserDocument(docId);
        }
    });
}

// Управление вкладками
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Работа с документами в Firestore
async function addUserDocument() {
    if (!currentUser) {
        showNotification('Сначала войдите в систему');
        return;
    }

    const docName = document.getElementById('docName').value;
    const docUrl = document.getElementById('docUrl').value;
    const docCategory = document.getElementById('docCategory').value;
    
    if (!docName || !docUrl) {
        showNotification('Заполните все поля');
        return;
    }
    
    try {
        new URL(docUrl);
    } catch (e) {
        showNotification('Введите корректную ссылку');
        return;
    }

    const newDoc = {
        name: docName,
        url: docUrl,
        category: docCategory,
        added: new Date().toISOString(),
        userId: currentUser.uid
    };

    try {
        await db.collection('documents').add(newDoc);
        showNotification(`Документ "${docName}" добавлен`);
        document.getElementById('addDocForm').reset();
        switchTab('library');
        await loadUserDocuments(); // Перезагружаем список
    } catch (error) {
        console.error('Ошибка добавления документа:', error);
        showNotification('Ошибка при добавлении документа');
    }
}

async function loadUserDocuments() {
    if (!currentUser) return;

    const syncStatus = document.getElementById('syncStatus');
    syncStatus.textContent = 'Загрузка документов...';
    syncStatus.style.background = '#fff3cd';
    syncStatus.style.color = '#856404';

    try {
        const snapshot = await db.collection('documents')
            .where('userId', '==', currentUser.uid)
            .orderBy('added', 'desc')
            .get();

        userDocuments = [];
        snapshot.forEach(doc => {
            userDocuments.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayUserDocuments();
        
        syncStatus.textContent = `Загружено документов: ${userDocuments.length}`;
        syncStatus.style.background = '#d1edff';
        syncStatus.style.color = '#004085';
        
    } catch (error) {
        console.error('Ошибка загрузки документов:', error);
        syncStatus.textContent = 'Ошибка загрузки';
        syncStatus.style.background = '#f8d7da';
        syncStatus.style.color = '#721c24';
    }
}

function displayUserDocuments() {
    const userDocsList = document.getElementById('user-docs-list');
    const userDocsSection = document.getElementById('user-docs-section');
    
    if (userDocuments.length === 0) {
        userDocsList.innerHTML = '<li style="color: #7f8c8d; text-align: center;">Нет документов</li>';
        return;
    }
    
    userDocsList.innerHTML = '';
    
    const docsByCategory = {};
    userDocuments.forEach(doc => {
        if (!docsByCategory[doc.category]) {
            docsByCategory[doc.category] = [];
        }
        docsByCategory[doc.category].push(doc);
    });
    
    Object.keys(docsByCategory).forEach(category => {
        const categoryTitle = getCategoryTitle(category);
        const categoryHeader = document.createElement('h4');
        categoryHeader.style.marginTop = '15px';
        categoryHeader.style.color = '#667eea';
        categoryHeader.textContent = categoryTitle;
        userDocsList.appendChild(categoryHeader);
        
        docsByCategory[category].forEach(doc => {
            const docItem = document.createElement('li');
            docItem.setAttribute('data-doc-id', doc.id);
            docItem.innerHTML = `
                <a href="${doc.url}" target="_blank" rel="noopener noreferrer">
                    ${doc.name}
                </a>
                <div class="doc-actions">
                    <button class="btn-small btn-delete" title="Удалить">🗑️ Удалить</button>
                </div>
            `;
            userDocsList.appendChild(docItem);
        });
    });
}

async function deleteUserDocument(docId) {
    if (!confirm('Удалить документ?')) return;

    try {
        await db.collection('documents').doc(docId).delete();
        showNotification('Документ удален');
        await loadUserDocuments(); // Перезагружаем список
    } catch (error) {
        console.error('Ошибка удаления документа:', error);
        showNotification('Ошибка при удалении документа');
    }
}

async function clearUserDocuments() {
    if (!confirm('Удалить ВСЕ ваши документы? Это действие нельзя отменить.')) return;

    try {
        const snapshot = await db.collection('documents')
            .where('userId', '==', currentUser.uid)
            .get();

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        showNotification('Все документы удалены');
        await loadUserDocuments();
    } catch (error) {
        console.error('Ошибка очистки документов:', error);
        showNotification('Ошибка при удалении документов');
    }
}

// Поиск документов
function searchDocuments(query) {
    const docsItems = document.querySelectorAll('.docs-list li');
    const searchTerm = query.toLowerCase();
    
    docsItems.forEach(item => {
        const docText = item.textContent.toLowerCase();
        if (docText.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Вспомогательные функции
function getCategoryTitle(categoryKey) {
    const categories = {
        'user': '📁 Мои документы',
        'normative': '📖 Нормативные документы',
        'instructions': '🔧 Инструкции',
        'schemes': '⚡ Схемы'
    };
    return categories[categoryKey] || categoryKey;
}

function updateTaskStatus(taskItem, newStatus) {
    const statusElement = taskItem.querySelector('.task-status');
    const taskActions = taskItem.querySelector('.task-actions');
    
    taskItem.setAttribute('data-status', newStatus);
    statusElement.textContent = getStatusText(newStatus);
    statusElement.className = 'task-status ' + newStatus;
    taskActions.innerHTML = getTaskActions(newStatus);
}

function getStatusText(status) {
    const statusMap = {
        'new': 'Новое',
        'in-progress': 'В работе',
        'completed': 'Выполнено',
        'rejected': 'Отказано'
    };
    return statusMap[status] || 'Неизвестно';
}

function getTaskActions(status) {
    const actions = {
        'new': `
            <button class="btn-task accept">Принять в работу</button>
            <button class="btn-task reject">Отказаться</button>
        `,
        'in-progress': `
            <button class="btn-task complete">Завершить работу</button>
            <button class="btn-task reset">Сбросить статус</button>
        `,
        'completed': `
            <button class="btn-task reset">Сбросить статус</button>
        `,
        'rejected': `
            <button class="btn-task reset">Сбросить статус</button>
        `
    };
    return actions[status] || '';
}

function filterTasks(filterType) {
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        const status = item.getAttribute('data-status');
        let showItem = true;
        
        switch(filterType) {
            case 'new': showItem = status === 'new'; break;
            case 'in-progress': showItem = status === 'in-progress'; break;
            case 'completed': showItem = status === 'completed'; break;
            case 'rejected': showItem = status === 'rejected'; break;
            default: showItem = true;
        }
        
        item.style.display = showItem ? 'block' : 'none';
    });
    
    showNotification(`Показаны задания: ${getFilterText(filterType)}`);
}

function getFilterText(filter) {
    const filterMap = {
        'all': 'Все',
        'new': 'Новые',
        'in-progress': 'В работе',
        'completed': 'Выполненные',
        'rejected': 'Отказанные'
    };
    return filterMap[filter] || 'Все';
}

// Уведомления
function showNotification(message) {
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function showLoginScreen() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
    document.getElementById('authStatus').textContent = '';
}

function showMainMenu() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// PWA функциональность
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('ServiceWorker зарегистрирован успешно');
            })
            .catch(function(error) {
                console.log('Ошибка регистрации ServiceWorker:', error);
            });
    });
}

// Утилиты для отладки
window.clearAppData = function() {
    if (confirm('Очистить все данные приложения?')) {
        localStorage.clear();
        auth.signOut();
        showNotification('Все данные очищены');
        setTimeout(() => location.reload(), 1000);
    }
};

window.getAuthStatus = function() {
    return {
        currentUser: currentUser,
        isLoggedIn: !!currentUser,
        userDocuments: userDocuments
    };
};

// Функция для добавления тестового задания
window.addTestTask = function() {
    const tasksList = document.querySelector('.tasks-list');
    if (tasksList) {
        const taskId = Date.now();
        const newTask = document.createElement('div');
        newTask.className = 'task-item';
        newTask.setAttribute('data-status', 'new');
        newTask.innerHTML = `
            <div class="task-header">
                <h3>#${taskId} - Плановый осмотр</h3>
                <span class="task-status new">Новое</span>
            </div>
            <p><strong>Адрес:</strong> ул. Советская, 45</p>
            <p><strong>Лифт:</strong> Schindler 3300</p>
            <p><strong>Срок:</strong> до 20.12.2024</p>
            <div class="task-actions">
                <button class="btn-task accept">Принять в работу</button>
                <button class="btn-task reject">Отказаться</button>
            </div>
        `;
        tasksList.appendChild(newTask);
        showNotification('Добавлено тестовое задание');
    }
};

console.log('Приложение инициализировано с Firebase (раздельные кнопки входа/регистрации)');