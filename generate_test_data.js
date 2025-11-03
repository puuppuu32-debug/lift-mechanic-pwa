const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDQd5RZyQAyOoI6Qzu6aCuQOxWSUQOVOxM",
  authDomain: "lift-mechanic-pwa.firebaseapp.com",
  projectId: "lift-mechanic-pwa",
  storageBucket: "lift-mechanic-pwa.firebasestorage.app",
  messagingSenderId: "504828099853",
  appId: "1:504828099853:web:6af96c6d3c79afa0930444"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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
      added: serverTimestamp(),
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

    // Генерация данных для PWA
    const pwaTasks = generateTestTasks('pwa', 50);
    const pwaDocuments = generateTestDocuments('pwa', 30);

    // Генерация данных для Flutter
    const flutterTasks = generateTestTasks('flutter', 50);
    const flutterDocuments = generateTestDocuments('flutter', 30);

    // Заполнение PWA коллекций
    console.log('📝 Заполняем PWA коллекции...');
    for (const task of pwaTasks) {
      await addDoc(collection(db, 'tasks_pwa'), task);
    }
    for (const doc of pwaDocuments) {
      await addDoc(collection(db, 'documents_pwa'), doc);
    }

    // Заполнение Flutter коллекций
    console.log('📱 Заполняем Flutter коллекции...');
    for (const task of flutterTasks) {
      await addDoc(collection(db, 'tasks_flutter'), task);
    }
    for (const doc of flutterDocuments) {
      await addDoc(collection(db, 'documents_flutter'), doc);
    }

    console.log('✅ Тестовые данные успешно созданы!');
    console.log(`📊 PWA: ${pwaTasks.length} задач, ${pwaDocuments.length} документов`);
    console.log(`📊 Flutter: ${flutterTasks.length} задач, ${flutterDocuments.length} документов`);

  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
  }
}

// Запуск
populateTestData();