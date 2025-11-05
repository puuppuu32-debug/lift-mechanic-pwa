// app.js v2.6 - Fixed offline authentication
console.log('App version 2.6 - Fixed offline authentication');

// Глобальные переменные
let currentUser = null;
let userDocuments = [];
let db = null;
let auth = null;
let isOffline = !navigator.onLine; // Определяем статус сразу при загрузке

// ==================== НОВЫЕ ФУНКЦИИ ДЛЯ ОФФЛАЙН-АУТЕНТИФИКАЦИИ ====================

function saveAuthState(user) {
    if (user) {
        localStorage.setItem('offlineAuth', JSON.stringify({
            email: user.email,
            uid: user.uid,
            timestamp: Date.now()
        }));
    } else {
        localStorage.removeItem('offlineAuth');
    }
}

function loadOfflineAuth() {
    const savedAuth = localStorage.getItem('offlineAuth');
    if (savedAuth) {
        try {
            const authData = JSON.parse(savedAuth);
            // Проверяем, не устарели ли данные (например, старше 7 дней)
            const isExpired = Date.now() - authData.timestamp > 7 * 24 * 60 * 60 * 1000;
            if (!isExpired) {
                return authData;
            } else {
                localStorage.removeItem('offlineAuth');
            }
        } catch (e) {
            console.warn('Failed to parse offline auth data');
            localStorage.removeItem('offlineAuth');
        }
    }
    return null;
}

function restoreOfflineSession() {
    const offlineAuth = loadOfflineAuth();
    if (offlineAuth && isOffline) {
        console.log('Restoring offline session for:', offlineAuth.email);
        
        // Создаем mock-объект пользователя для оффлайн-режима
        const mockUser = {
            email: offlineAuth.email,
            uid: offlineAuth.uid,
            isOffline: true
        };
        
        currentUser = mockUser;
        document.getElementById('userEmail').textContent = offlineAuth.email + ' (Оффлайн)';
        showMainMenu();
        loadCachedData();
        showNotification('📱 Восстановлена оффлайн-сессия');
        return true;
    }
    return false;
}

function loadCachedData() {
    console.log('Loading cached data for offline mode...');
    loadCachedTasks();
    loadCachedDocuments();
    
    // Обновляем статус синхронизации
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = '🔴 Оффлайн - локальные данные';
        syncStatus.style.background = '#fff3cd';
        syncStatus.style.color = '#856404';
    }
}

// ==================== ОБНОВЛЕННЫЕ СУЩЕСТВУЮЩИЕ ФУНКЦИИ ====================

// Глобальная функция инициализации
window.initApp = function() {
    console.log('Initializing Firebase application...');
    
    // Сначала пытаемся восстановить оффлайн-сессию
    if (isOffline) {
        console.log('Offline mode detected, attempting to restore session...');
        if (restoreOfflineSession()) {
            console.log('Offline session restored successfully');
            setupEventListeners();
            return; // Прерываем инициализацию Firebase в оффлайне
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
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        showNotification('Приложение загружено в ограниченном режиме');
        
        // Пытаемся восстановить оффлайн-сессию при ошибке инициализации
        if (!restoreOfflineSession()) {
            setupBasicEventListeners();
        }
    }
};

function initAuthListener() {
    if (!auth) {
        console.warn('Auth not available, skipping auth listener');
        // Пытаемся восстановить оффлайн-сессию
        if (!restoreOfflineSession()) {
            showLoginScreen();
        }
        return;
    }
    
    auth.onAuthStateChanged(function(user) {
        console.log('Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            currentUser = user;
            
            // Сохраняем состояние аутентификации для оффлайн использования
            saveAuthState(user);
            
            // Обновляем email в интерфейсе
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
    
    // Если мы уже в оффлайн-режиме, пытаемся восстановить сессию сразу
    if (isOffline && !currentUser) {
        setTimeout(() => {
            if (!currentUser && !restoreOfflineSession()) {
                showLoginScreen();
            }
        }, 1000);
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

function updateOnlineStatus(isOnline) {
    isOffline = !isOnline;
    const statusElement = document.getElementById('syncStatus');
    
    if (statusElement) {
        if (isOnline) {
            statusElement.innerHTML = '🟢 Онлайн';
            statusElement.style.background = '#d4edda';
            statusElement.style.color = '#155724';
        } else {
            statusElement.innerHTML = '🔴 Оффлайн - локальные данные';
            statusElement.style.background = '#fff3cd';
            statusElement.style.color = '#856404';
        }
    }
    
    // Если перешли в онлайн и есть оффлайн-пользователь, пытаемся синхронизироваться
    if (isOnline && currentUser && currentUser.isOffline) {
        showNotification('🔄 Синхронизация данных...');
        // Здесь можно добавить логику синхронизации
    }
}

function checkFirebase() {
    if ((!db || !auth) && !isOffline) {
        console.error('Firebase not initialized');
        showNotification('Система временно недоступна');
        return false;
    }
    
    if (isOffline) {
        if (currentUser && currentUser.isOffline) {
            // Разрешаем просмотр данных в оффлайн-режиме
            return false; // Но возвращаем false чтобы показать что Firebase недоступен
        } else {
            showNotification('🔌 Оффлайн режим - требуется аутентификация');
            return false;
        }
    }
    
    return !!(db && auth);
}

// Инициализация оффлайн данных
function initOfflineData() {
    console.log('Initializing offline data...');
    
    // Проверяем есть ли сохраненные данные
    const cachedUser = localStorage.getItem('cachedCurrentUser');
    if (cachedUser && !currentUser) {
        try {
            const userData = JSON.parse(cachedUser);
            document.getElementById('userEmail').textContent = userData.email;
            showNotification('📱 Используем локальные данные');
        } catch (e) {
            console.warn('Failed to parse cached user data');
        }
    }
    
    // Загружаем кэшированные задания если нет соединения
    if (isOffline) {
        loadCachedTasks();
        loadCachedDocuments();
    }
}

// ==================== ОБНОВЛЕННЫЕ ФУНКЦИИ ДЛЯ ЗАДАНИЙ ====================

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

// ==================== ОБНОВЛЕННЫЕ ФУНКЦИИ ДЛЯ ДОКУМЕНТОВ ====================

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

// ==================== ОБНОВЛЕННАЯ ФУНКЦИЯ СОЗДАНИЯ ЭЛЕМЕНТА ЗАДАНИЯ ====================

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

// ==================== ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ PWA ====================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker зарегистрирован успешно: ', registration.scope);
            })
            .catch(function(error) {
                console.log('Ошибка регистрации ServiceWorker: ', error);
            });

        window.addEventListener('online', function() {
            console.log('Соединение восстановлено');
            isOffline = false;
            showNotification('✅ Соединение восстановлено');
            
            // Если есть оффлайн-пользователь, переключаем на онлайн-режим
            if (currentUser && currentUser.isOffline) {
                // Здесь можно добавить логику для перезагрузки реальных данных
                showNotification('🔄 Синхронизация с сервером...');
            }
            
            if (currentUser) {
                loadUserDocuments();
                // Автоматически обновляем задания если открыто модальное окно
                if (document.getElementById('tasksModal').style.display === 'block') {
                    setTimeout(() => loadTasks(), 1000);
                }
            }
            updateOnlineStatus(true);
        });

        window.addEventListener('offline', function() {
            console.log('Режим оффлайн');
            isOffline = true;
            showNotification('🔌 Режим оффлайн - используются кэшированные данные');
            updateOnlineStatus(false);
        });
    });
}

console.log('Приложение v2.6 инициализировано с исправленной оффлайн-аутентификацией');