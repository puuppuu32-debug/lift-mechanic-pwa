// app.js v3.0 - Enhanced offline reliability
console.log('App version 3.0 - Enhanced offline reliability');

// Глобальные переменные
let currentUser = null;
let userDocuments = [];
let db = null;
let auth = null;
let isOffline = !navigator.onLine;

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

// ==================== УЛУЧШЕННЫЕ ФУНКЦИИ ДЛЯ ОФФЛАЙН-РАБОТЫ ====================

// Сохранение состояния аутентификации
function saveAuthState(user) {
    try {
        if (user) {
            localStorage.setItem('offlineAuth', JSON.stringify({
                email: user.email,
                uid: user.uid,
                timestamp: Date.now()
            }));
            console.log('Auth state saved for offline use');
        } else {
            localStorage.removeItem('offlineAuth');
        }
    } catch (error) {
        console.warn('Failed to save auth state:', error);
    }
}

// Загрузка оффлайн-аутентификации
function loadOfflineAuth() {
    try {
        const savedAuth = localStorage.getItem('offlineAuth');
        if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            // Проверяем срок действия (7 дней)
            const isExpired = Date.now() - authData.timestamp > 7 * 24 * 60 * 60 * 1000;
            if (!isExpired) {
                return authData;
            } else {
                localStorage.removeItem('offlineAuth');
            }
        }
    } catch (error) {
        console.warn('Failed to load offline auth:', error);
        localStorage.removeItem('offlineAuth');
    }
    return null;
}

// Восстановление оффлайн-сессии
function restoreOfflineSession() {
    try {
        const offlineAuth = loadOfflineAuth();
        if (offlineAuth && isOffline) {
            console.log('Restoring offline session for:', offlineAuth.email);
            
            // Создаем mock-объект пользователя
            const mockUser = {
                email: offlineAuth.email,
                uid: offlineAuth.uid,
                isOffline: true
            };
            
            currentUser = mockUser;
            
            // Обновляем интерфейс
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = offlineAuth.email + ' (Оффлайн)';
            }
            
            showMainMenu();
            loadCachedData();
            showNotification('📱 Восстановлена оффлайн-сессия');
            return true;
        }
    } catch (error) {
        console.error('Error restoring offline session:', error);
    }
    return false;
}

// Загрузка кэшированных данных
function loadCachedData() {
    console.log('Loading cached data for offline mode...');
    try {
        loadCachedTasks();
        loadCachedDocuments();
        
        // Обновляем статус синхронизации
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.textContent = '🔴 Оффлайн - локальные данные';
            syncStatus.style.background = '#fff3cd';
            syncStatus.style.color = '#856404';
        }
    } catch (error) {
        console.error('Error loading cached data:', error);
    }
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ ====================

// Глобальная функция инициализации
window.initApp = function() {
    console.log('Initializing Firebase application with enhanced offline support...');
    
    // Показываем что приложение загружается
    showNotification('🔄 Загрузка приложения...');
    
    // Сначала пытаемся восстановить оффлайн-сессию
    if (isOffline) {
        console.log('Offline mode detected, attempting to restore session...');
        if (restoreOfflineSession()) {
            console.log('Offline session restored successfully');
            setupEventListeners();
            showNotification('✅ Приложение готово к работе в оффлайн-режиме');
            return;
        }
    }
    
    try {
        // Проверяем доступность Firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not available');
        }

        // Инициализируем Firebase
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        
        console.log('✅ Firebase initialized successfully');
        console.log('📊 Firestore:', db ? 'ready' : 'not ready');
        console.log('🔐 Auth:', auth ? 'ready' : 'not ready');
        
        // Запускаем основную логику приложения
        initAuthListener();
        setupEventListeners();
        
        showNotification('✅ Приложение успешно загружено');
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        
        // Пытаемся восстановить оффлайн-сессию при ошибке
        if (!restoreOfflineSession()) {
            showNotification('⚠️ Приложение загружено в ограниченном режиме');
            setupBasicEventListeners();
            
            // Показываем базовый интерфейс
            const loginScreen = document.getElementById('loginScreen');
            const mainMenu = document.getElementById('mainMenu');
            if (loginScreen) loginScreen.classList.add('active');
        }
    }
};

// Инициализация слушателя аутентификации
function initAuthListener() {
    if (!auth) {
        console.warn('Auth not available, attempting offline restoration');
        if (!restoreOfflineSession()) {
            showLoginScreen();
        }
        return;
    }
    
    auth.onAuthStateChanged(function(user) {
        console.log('Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            currentUser = user;
            
            // Сохраняем состояние для оффлайн использования
            saveAuthState(user);
            
            // Обновляем интерфейс
            document.getElementById('userEmail').textContent = user.email;
            
            showMainMenu();
            loadUserData();
            
            if (isOffline) {
                showNotification(`Добро пожаловать, ${user.email}! (Оффлайн режим)`);
            } else {
                showNotification(`Добро пожаловать, ${user.email}!`);
            }
            
        } else {
            currentUser = null;
            userDocuments = [];
            
            // Пытаемся восстановить оффлайн-сессию
            if (!restoreOfflineSession()) {
                saveAuthState(null);
                showLoginScreen();
            }
        }
    });
    
    // Дополнительная проверка для оффлайн-режима
    if (isOffline && !currentUser) {
        setTimeout(() => {
            if (!currentUser && !restoreOfflineSession()) {
                showLoginScreen();
            }
        }, 1000);
    }
}

// Базовая настройка обработчиков (без Firebase)
function setupBasicEventListeners() {
    console.log('Setting up basic event listeners for offline mode');
    
    try {
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
        
        // Обработчики для оффлайн функционала
        setupOfflineFunctionality();
        
        // Показываем уведомление о ограниченном режиме
        showNotification('🔌 Оффлайн режим - базовые функции');
        
    } catch (error) {
        console.error('Error setting up basic event listeners:', error);
    }
}

// Настройка оффлайн функционала
function setupOfflineFunctionality() {
    try {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                if (isOffline) {
                    const menuText = this.querySelector('h3').textContent;
                    if (menuText.includes('Задания')) {
                        showModal('tasksModal');
                        loadCachedTasks();
                    } else if (menuText.includes('Литература')) {
                        showModal('literatureModal');
                        loadCachedDocuments();
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error setting up offline functionality:', error);
    }
}

// Основная настройка обработчиков событий
function setupEventListeners() {
    try {
        // Форма входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleLogin();
            });
        }
        
        // Кнопка регистрации
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', function() {
                handleRegister();
            });
        }
        
        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Кнопки меню
        const tasksBtn = document.getElementById('tasksBtn');
        if (tasksBtn) {
            tasksBtn.addEventListener('click', function() {
                showModal('tasksModal');
                if (isOffline) {
                    loadCachedTasks();
                } else {
                    loadTasks();
                }
            });
        }
        
        const literatureBtn = document.getElementById('literatureBtn');
        if (literatureBtn) {
            literatureBtn.addEventListener('click', function() {
                showModal('literatureModal');
                if (isOffline) {
                    loadCachedDocuments();
                }
            });
        }
        
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
        
        // Инициализация функциональности
        setupTasksFunctionality();
        setupLiteratureFunctionality();
        setupOfflineFunctionality();
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Проверка доступности Firebase
function checkFirebase() {
    if ((!db || !auth) && !isOffline) {
        console.error('Firebase not initialized');
        if (!isOffline) {
            showNotification('Система временно недоступна');
        }
        return false;
    }
    
    if (isOffline) {
        if (currentUser && currentUser.isOffline) {
            return false; // Разрешаем просмотр в оффлайн-режиме
        } else {
            showNotification('🔌 Оффлайн режим - требуется аутентификация');
            return false;
        }
    }
    
    return !!(db && auth);
}

// Аутентификация - ВХОД
async function handleLogin() {
    if (!checkFirebase()) return;

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
    if (!checkFirebase()) return;

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
    if (!auth && currentUser && currentUser.isOffline) {
        // Выход из оффлайн-сессии
        currentUser = null;
        saveAuthState(null);
        localStorage.removeItem('cachedCurrentUser');
        localStorage.removeItem('cachedTasks');
        localStorage.removeItem('cachedDocuments');
        showNotification('Вы вышли из оффлайн-сессии');
        showLoginScreen();
        return;
    }
    
    if (!auth) return;
    
    auth.signOut();
    saveAuthState(null);
    showNotification('Вы вышли из системы');
}

// Загрузка пользовательских данных
async function loadUserData() {
    if (!currentUser) return;

    document.getElementById('userEmail').textContent = currentUser.email;
    await loadUserDocuments();
}

// ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАДАНИЯМИ ====================

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

// Загрузка заданий из Firebase
async function loadTasks() {
    if (!checkFirebase() || !currentUser) {
        loadCachedTasks();
        return;
    }

    try {
        const tasksList = document.querySelector('.tasks-list');
        tasksList.innerHTML = '<div style="text-align: center; color: #7f8c8d;">Загрузка заданий...</div>';

        const snapshot = await db.collection('tasks_pwa')
            .where('userId', '==', currentUser.uid)
            .orderBy('added', 'desc')
            .get();

        const tasks = [];
        tasksList.innerHTML = '';

        if (snapshot.empty) {
            tasksList.innerHTML = '<div style="text-align: center; color: #7f8c8d;">Нет заданий</div>';
            // Очищаем кэш если нет заданий
            localStorage.removeItem('cachedTasks');
            return;
        }

        snapshot.forEach(doc => {
            const task = {
                id: doc.id,
                ...doc.data()
            };
            tasks.push(task);
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });

        // Сохраняем задания в localStorage для оффлайн использования
        localStorage.setItem('cachedTasks', JSON.stringify(tasks));
        
        showNotification(`📋 Загружено ${tasks.length} заданий`);

    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        loadCachedTasks();
    }
}

// Загрузка кэшированных заданий
function loadCachedTasks() {
    const tasksList = document.querySelector('.tasks-list');
    const cachedTasks = localStorage.getItem('cachedTasks');
    
    if (!cachedTasks) {
        tasksList.innerHTML = '<div style="text-align: center; color: #7f8c8d;">Нет сохраненных заданий для оффлайн просмотра</div>';
        return;
    }
    
    try {
        const tasks = JSON.parse(cachedTasks);
        tasksList.innerHTML = '';
        
        if (tasks.length === 0) {
            tasksList.innerHTML = '<div style="text-align: center; color: #7f8c8d;">Нет заданий</div>';
            return;
        }
        
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
        
        showNotification(`📱 Показаны сохраненные задания (${tasks.length} шт.)`);
        
    } catch (error) {
        console.error('Ошибка загрузки кэшированных заданий:', error);
        tasksList.innerHTML = '<div style="text-align: center; color: #e74c3c;">Ошибка загрузки локальных данных</div>';
    }
}

function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.setAttribute('data-task-id', task.id);
    taskItem.setAttribute('data-status', task.status || 'new');
    
    const isOfflineUser = currentUser && currentUser.isOffline;
    
    taskItem.innerHTML = `
        <div class="task-header">
            <h3>${task.title || 'Без названия'}</h3>
            <span class="task-status ${task.status || 'new'}">${getStatusText(task.status || 'new')}</span>
        </div>
        ${task.description ? `<p><strong>Описание:</strong> ${task.description}</p>` : ''}
        ${task.address ? `<p><strong>Адрес:</strong> ${task.address}</p>` : ''}
        ${task.lift ? `<p><strong>Лифт:</strong> ${task.lift}</p>` : ''}
        ${task.deadline ? `<p><strong>Срок:</strong> ${task.deadline}</p>` : ''}
        ${task.priority ? `<p><strong>Приоритет:</strong> ${task.priority}</p>` : ''}
        ${isOfflineUser ? '<p style="color: #e67e22;"><strong>⚠ Оффлайн режим</strong></p>' : ''}
        <div class="task-actions">
            ${isOfflineUser ? '<button class="btn-task" disabled title="Недоступно в оффлайн режиме">Обновить статус</button>' : getTaskActions(task.status || 'new')}
        </div>
    `;
    
    return taskItem;
}

// Обновление статуса задания в Firebase
async function updateTaskStatus(taskItem, newStatus) {
    if (!checkFirebase()) {
        showNotification('Недоступно в оффлайн режиме');
        return;
    }

    const taskId = taskItem.getAttribute('data-task-id');
    const taskTitle = taskItem.querySelector('h3').textContent;
    
    try {
        await db.collection('tasks_pwa').doc(taskId).update({
            status: newStatus,
            updated: new Date().toISOString()
        });

        const statusElement = taskItem.querySelector('.task-status');
        const taskActions = taskItem.querySelector('.task-actions');
        
        taskItem.setAttribute('data-status', newStatus);
        statusElement.textContent = getStatusText(newStatus);
        statusElement.className = 'task-status ' + newStatus;
        taskActions.innerHTML = getTaskActions(newStatus);
        
        showNotification(`Статус задания "${taskTitle}" обновлен на "${getStatusText(newStatus)}"`);
        
        // Обновляем кэш
        setTimeout(() => loadTasks(), 1000);
        
    } catch (error) {
        console.error('Ошибка обновления задания:', error);
        showNotification('Ошибка при обновлении задания');
    }
}

// ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С ЛИТЕРАТУРОЙ ====================

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

// Загрузка кэшированных документов
function loadCachedDocuments() {
    const cachedDocs = localStorage.getItem('cachedDocuments');
    if (cachedDocs) {
        try {
            userDocuments = JSON.parse(cachedDocs);
            displayUserDocuments();
            showNotification('📚 Загружены сохраненные документы');
        } catch (error) {
            console.error('Ошибка загрузки кэшированных документов:', error);
        }
    }
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
    if (!checkFirebase() || !currentUser) {
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
        await db.collection('documents_pwa').add(newDoc);
        showNotification(`Документ "${docName}" добавлен`);
        document.getElementById('addDocForm').reset();
        switchTab('library');
        await loadUserDocuments();
    } catch (error) {
        console.error('Ошибка добавления документа:', error);
        showNotification('Ошибка при добавлении документа');
    }
}

async function loadUserDocuments() {
    if (!checkFirebase() || !currentUser) {
        loadCachedDocuments();
        return;
    }

    const syncStatus = document.getElementById('syncStatus');
    syncStatus.textContent = 'Загрузка документов...';
    syncStatus.style.background = '#fff3cd';
    syncStatus.style.color = '#856404';

    try {
        const snapshot = await db.collection('documents_pwa')
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
        
        // Сохраняем документы для оффлайн использования
        localStorage.setItem('cachedDocuments', JSON.stringify(userDocuments));
        
        syncStatus.textContent = `Загружено документов: ${userDocuments.length}`;
        syncStatus.style.background = '#d1edff';
        syncStatus.style.color = '#004085';
        
    } catch (error) {
        console.error('Ошибка загрузки документов:', error);
        loadCachedDocuments();
        syncStatus.textContent = 'Оффлайн режим - локальные данные';
        syncStatus.style.background = '#fff3cd';
        syncStatus.style.color = '#856404';
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
            const isOfflineUser = currentUser && currentUser.isOffline;
            docItem.innerHTML = `
                <a href="${doc.url}" target="_blank" rel="noopener noreferrer">
                    ${doc.name}
                </a>
                <div class="doc-actions">
                    ${isOfflineUser ? '<span style="color: #e67e22; font-size: 12px;">⚠ Оффлайн</span>' : `<button class="btn-small btn-delete" title="Удалить">🗑️ Удалить</button>`}
                </div>
            `;
            userDocsList.appendChild(docItem);
        });
    });
}

async function deleteUserDocument(docId) {
    if (!checkFirebase()) {
        showNotification('Недоступно в оффлайн режиме');
        return;
    }
    if (!confirm('Удалить документ?')) return;

    try {
        await db.collection('documents_pwa').doc(docId).delete();
        showNotification('Документ удален');
        await loadUserDocuments();
    } catch (error) {
        console.error('Ошибка удаления документа:', error);
        showNotification('Ошибка при удалении документа');
    }
}

async function clearUserDocuments() {
    if (!checkFirebase()) {
        showNotification('Недоступно в оффлайн режиме');
        return;
    }
    if (!confirm('Удалить ВСЕ ваши документы? Это действие нельзя отменить.')) return;

    try {
        const snapshot = await db.collection('documents_pwa')
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

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getCategoryTitle(categoryKey) {
    const categories = {
        'user': '📁 Мои документы',
        'normative': '📖 Нормативные документы',
        'instructions': '🔧 Инструкции',
        'schemes': '⚡ Схемы'
    };
    return categories[categoryKey] || categoryKey;
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

// Улучшенные уведомления с обработкой ошибок
function showNotification(message) {
    try {
        // Удаляем существующие уведомления
        const existingNotification = document.querySelector('.custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Создаем новое уведомление
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
        
        // Анимация появления
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// Улучшенное управление экранами
function showLoginScreen() {
    try {
        const mainMenu = document.getElementById('mainMenu');
        const loginScreen = document.getElementById('loginScreen');
        
        if (mainMenu) mainMenu.classList.remove('active');
        if (loginScreen) loginScreen.classList.add('active');
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
        }
        
        const authStatus = document.getElementById('authStatus');
        if (authStatus) {
            authStatus.textContent = '';
        }
    } catch (error) {
        console.error('Error showing login screen:', error);
    }
}

function showMainMenu() {
    try {
        const loginScreen = document.getElementById('loginScreen');
        const mainMenu = document.getElementById('mainMenu');
        
        if (loginScreen) loginScreen.classList.remove('active');
        if (mainMenu) mainMenu.classList.add('active');
    } catch (error) {
        console.error('Error showing main menu:', error);
    }
}

// Улучшенное управление модальными окнами
function showModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error showing modal:', error);
    }
}

function closeModals() {
    try {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    } catch (error) {
        console.error('Error closing modals:', error);
    }
}

// Обновление статуса онлайн/оффлайн
function updateOnlineStatus(online) {
    isOffline = !online;
    const statusElement = document.getElementById('syncStatus');
    
    if (statusElement) {
        if (online) {
            statusElement.textContent = '🟢 Онлайн';
            statusElement.style.background = '#d4edda';
            statusElement.style.color = '#155724';
        } else {
            statusElement.textContent = '🔴 Оффлайн - локальные данные';
            statusElement.style.background = '#fff3cd';
            statusElement.style.color = '#856404';
        }
    }
    
    // Синхронизация при переходе в онлайн
    if (online && currentUser && currentUser.isOffline) {
        showNotification('🔄 Синхронизация данных...');
        // Здесь можно добавить логику синхронизации
    }
}

// ==================== PWA И СЕТЕВЫЕ ФУНКЦИИ ====================

// Регистрация Service Worker с улучшенной обработкой
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker зарегистрирован успешно: ', registration.scope);
                
                // Отслеживание обновлений Service Worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New Service Worker found:', newWorker);
                });
            })
            .catch(function(error) {
                console.log('Ошибка регистрации ServiceWorker: ', error);
            });

        // Отслеживание изменений сети
        window.addEventListener('online', function() {
            console.log('Соединение восстановлено');
            isOffline = false;
            showNotification('✅ Соединение восстановлено');
            updateOnlineStatus(true);
            
            // Перезагрузка данных при восстановлении связи
            if (currentUser && !currentUser.isOffline) {
                setTimeout(() => {
                    loadUserDocuments();
                    if (document.getElementById('tasksModal').style.display === 'block') {
                        loadTasks();
                    }
                }, 1000);
            }
        });

        window.addEventListener('offline', function() {
            console.log('Режим оффлайн');
            isOffline = true;
            showNotification('🔌 Режим оффлайн - используются кэшированные данные');
            updateOnlineStatus(false);
        });
    });
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОТЛАДКИ ====================

window.clearAppData = function() {
    if (confirm('Очистить все данные приложения?')) {
        try {
            localStorage.clear();
            if (auth) auth.signOut();
            showNotification('Все данные очищены');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Error clearing app data:', error);
        }
    }
};

window.getAppStatus = function() {
    return {
        currentUser: currentUser,
        isLoggedIn: !!currentUser,
        userDocuments: userDocuments,
        firebaseReady: !!(db && auth),
        isOffline: isOffline,
        serviceWorker: 'serviceWorker' in navigator ? 'available' : 'not available'
    };
};

// Функция для добавления тестового задания
window.addTestTask = function() {
    if (!checkFirebase() || !currentUser) {
        showNotification('Сначала войдите в систему');
        return;
    }

    const newTask = {
        title: `Тестовое задание #${Date.now()}`,
        description: 'Плановый осмотр лифтового оборудования',
        address: 'ул. Тестовая, 123',
        lift: 'Schindler 3300',
        deadline: 'до 31.12.2024',
        priority: 'Средний',
        status: 'new',
        added: new Date().toISOString(),
        userId: currentUser.uid
    };

    db.collection('tasks_pwa').add(newTask)
        .then(() => {
            showNotification('Тестовое задание добавлено');
            if (document.getElementById('tasksModal').style.display === 'block') {
                loadTasks();
            }
        })
        .catch(error => {
            console.error('Ошибка добавления тестового задания:', error);
            showNotification('Ошибка при добавлении задания');
        });
};

// Глобальный обработчик ошибок
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e);
    
    // Показываем пользователю friendly сообщение
    if (e.error && e.error.message && e.error.message.includes('Loading')) {
        showNotification('⚠️ Ошибка загрузки ресурсов');
    }
});

console.log('App v3.0 initialized with enhanced offline reliability');