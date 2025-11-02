document.addEventListener('DOMContentLoaded', function() {
    // Инициализация приложения
    initApp();
});

function initApp() {
    // Проверка авторизации
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    console.log('Статус авторизации:', isLoggedIn);
    
    if (isLoggedIn === 'true') {
        showMainMenu();
    } else {
        showLoginScreen();
    }

    // Настройка обработчиков событий
    setupEventListeners();
    
    // Инициализация новых функций
    initNewFeatures();
    
    // Загрузка пользовательских документов
    loadUserDocuments();
}

function setupEventListeners() {
    // Форма авторизации
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Кнопки меню
    document.getElementById('tasksBtn').addEventListener('click', function() {
        showModal('tasksModal');
    });
    
    document.getElementById('literatureBtn').addEventListener('click', function() {
        showModal('literatureModal');
        loadUserDocuments(); // Перезагружаем документы при открытии
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

// Функции для работы с заданиями
function setupTasksFunctionality() {
    // Фильтрация заданий
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterTasks(filter);
        });
    });
    
    // Обработка действий с заданиями
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-task')) {
            const taskItem = e.target.closest('.task-item');
            const taskTitle = taskItem.querySelector('h3').textContent;
            const taskStatus = taskItem.getAttribute('data-status');
            
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
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Форма добавления документа
    document.getElementById('addDocForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addUserDocument();
    });
    
    // Кнопка очистки документов
    document.getElementById('clearDocsBtn').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите удалить все ваши документы?')) {
            clearUserDocuments();
        }
    });
    
    // Поиск документов
    document.getElementById('searchDocs').addEventListener('input', function(e) {
        searchDocuments(e.target.value);
    });
    
    // Обработка удаления документов
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-delete')) {
            const docItem = e.target.closest('li');
            const docName = docItem.querySelector('a').textContent;
            deleteUserDocument(docName);
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

// Добавление пользовательского документа
function addUserDocument() {
    const docName = document.getElementById('docName').value;
    const docUrl = document.getElementById('docUrl').value;
    const docCategory = document.getElementById('docCategory').value;
    
    if (!docName || !docUrl) {
        showNotification('Заполните все поля');
        return;
    }
    
    // Валидация URL
    try {
        new URL(docUrl);
    } catch (e) {
        showNotification('Введите корректную ссылку');
        return;
    }
    
    const userDocs = JSON.parse(localStorage.getItem('userDocuments') || '[]');
    
    if (userDocs.some(doc => doc.name === docName)) {
        showNotification('Документ с таким названием уже существует');
        return;
    }
    
    userDocs.push({
        name: docName,
        url: docUrl,
        category: docCategory,
        added: new Date().toISOString()
    });
    
    localStorage.setItem('userDocuments', JSON.stringify(userDocs));
    loadUserDocuments();
    document.getElementById('addDocForm').reset();
    switchTab('library');
    showNotification(`Документ "${docName}" добавлен`);
}

// Загрузка пользовательских документов
function loadUserDocuments() {
    const userDocs = JSON.parse(localStorage.getItem('userDocuments') || '[]');
    const userDocsList = document.getElementById('user-docs-list');
    const userDocsSection = document.getElementById('user-docs-section');
    
    if (userDocs.length === 0) {
        userDocsSection.style.display = 'none';
        return;
    }
    
    userDocsSection.style.display = 'block';
    userDocsList.innerHTML = '';
    
    const docsByCategory = {};
    userDocs.forEach(doc => {
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

// Получение названия категории
function getCategoryTitle(categoryKey) {
    const categories = {
        'user': '📁 Мои документы',
        'normative': '📖 Нормативные документы',
        'instructions': '🔧 Инструкции',
        'schemes': '⚡ Схемы'
    };
    return categories[categoryKey] || categoryKey;
}

// Удаление пользовательского документа
function deleteUserDocument(docName) {
    if (!confirm(`Удалить документ "${docName}"?`)) {
        return;
    }
    
    const userDocs = JSON.parse(localStorage.getItem('userDocuments') || '[]');
    const updatedDocs = userDocs.filter(doc => doc.name !== docName);
    
    localStorage.setItem('userDocuments', JSON.stringify(updatedDocs));
    loadUserDocuments();
    showNotification(`Документ "${docName}" удален`);
}

// Очистка всех пользовательских документов
function clearUserDocuments() {
    localStorage.removeItem('userDocuments');
    loadUserDocuments();
    showNotification('Все документы удалены');
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

// Обновление статуса задания
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
    const notification = document.createElement('div');
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

function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username && password) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        
        showMainMenu();
        showNotification(`Добро пожаловать, ${username}!`);
    } else {
        showNotification('Пожалуйста, заполните все поля');
    }
}

function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    showLoginScreen();
    showNotification('Вы вышли из системы');
}

function showLoginScreen() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
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
    localStorage.clear();
    console.log('Все данные приложения очищены');
    showNotification('Данные очищены');
    setTimeout(() => location.reload(), 1000);
};

window.getAuthStatus = function() {
    return {
        isLoggedIn: localStorage.getItem('isLoggedIn'),
        username: localStorage.getItem('username')
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

console.log('Приложение инициализировано');