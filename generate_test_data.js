const admin = require('firebase-admin');

// Инициализация с сервисным аккаунтом
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Генерация тестовых задач
function generateTestTasks(userIdPrefix, count = 50) {
  const tasks = [];
  const statuses = ['new', 'in-progress', 'completed', 'rejected'];
  const addresses = [
    'ул. Ленина, 15', 'пр. Мира, 28', 'ул. Советская, 45', 
    'ул. Пушкина, 67', 'пр. Гагарина, 12', 'ул. Кирова, 89'
  ];
  const elevators = ['Schindler 3300', 'OTIS Gen2', 'KONE MonoSpace', 'Thyssen Krupp'];

  for (let i = 1; i <= count; i++) {
    tasks.push({
      title: `Тестовая задача #${i}`,
      address: addresses[i % addresses.length],
      elevator: elevators[i % elevators.length],
      deadline: `2024-12-${String(i % 28 + 1).padStart(2, '0')}`,
      status: statuses[i % statuses.length],
      userId: `${userIdPrefix}_user_${i % 5}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return tasks;
}

// Генерация тестовых документов
function generateTestDocuments(userIdPrefix, count = 30) {
  const documents = [];
  const categories = ['normative', 'instructions', 'schemes', 'user'];
  
  for (let i = 1; i <= count; i++) {
    documents.push({
      name: `Тестовый документ #${i}`,
      url: `https://example.com/document${i}.pdf`,
      category: categories[i % categories.length],
      added: admin.firestore.FieldValue.serverTimestamp(),
      userId: `${userIdPrefix}_user_${i % 5}`,
      cached: false
    });
  }
  return documents;
}

// Основная функция
async function populateTestData() {
  try {
    console.log('🚀 Начинаем заполнение тестовых данных...');

    // Генерация данных
    const pwaTasks = generateTestTasks('pwa', 50);
    const pwaDocuments = generateTestDocuments('pwa', 30);
    const flutterTasks = generateTestTasks('flutter', 50);
    const flutterDocuments = generateTestDocuments('flutter', 30);

    // Пакетная запись для производительности
    const batch = db.batch();

    // Добавляем задачи PWA
    pwaTasks.forEach(task => {
      const docRef = db.collection('tasks_pwa').doc();
      batch.set(docRef, task);
    });

    // Добавляем документы PWA
    pwaDocuments.forEach(doc => {
      const docRef = db.collection('documents_pwa').doc();
      batch.set(docRef, doc);
    });

    // Добавляем задачи Flutter
    flutterTasks.forEach(task => {
      const docRef = db.collection('tasks_flutter').doc();
      batch.set(docRef, task);
    });

    // Добавляем документы Flutter
    flutterDocuments.forEach(doc => {
      const docRef = db.collection('documents_flutter').doc();
      batch.set(docRef, doc);
    });

    // Выполняем пакетную запись
    await batch.commit();

    console.log('✅ Тестовые данные успешно созданы!');
    console.log(`📊 PWA: ${pwaTasks.length} задач, ${pwaDocuments.length} документов`);
    console.log(`📊 Flutter: ${flutterTasks.length} задач, ${flutterDocuments.length} документов`);

  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
  }
}

// Запуск
populateTestData();