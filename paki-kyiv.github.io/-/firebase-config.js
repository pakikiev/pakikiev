// Firebase конфігурація
const firebaseConfig = {
  apiKey: "AIzaSyDV_CUb_luEGCTN9J9F7Yi8Ibyz-C9UChY",
  authDomain: "paki-kyiv.firebaseapp.com",
  databaseURL: "https://paki-kyiv-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "paki-kyiv",
  storageBucket: "paki-kyiv.firebasestorage.app",
  messagingSenderId: "839898534733",
  appId: "1:839898534733:web:2248bd983c2062e9f41d04",
  measurementId: "G-ZC83D6RNC4"
};

let db = null;

// Ініціалізація Firebase з перевіркою
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    console.log('✅ Firebase ініціалізовано успішно');
  } else {
    console.warn('⚠️ Firebase SDK не завантажено, буду використовувати локальні дані');
  }
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error);
}

// Загрузить данные с сервера
async function loadDataFromFirebase() {
  if (!db) {
    console.warn('Firebase не инициализирован, используем стандартные данные');
    return getDefaultData();
  }

  try {
    const snapshot = await db.ref('siteData').once('value');
    const data = snapshot.val();
    console.log('✅ Данные загружены из Firebase');
    return data || getDefaultData();
  } catch (error) {
    console.warn('⚠️ Firebase недоступен, используем локальные данные:', error);
    return getDefaultData();
  }
}

// Сохранить данные на сервер
async function saveDataToFirebase(data) {
  if (!db) {
    console.warn('⚠️ Firebase не инициализирован! Данные не сохранены.');
    return { success: false, message: 'Firebase недоступен' };
  }

  try {
    await db.ref('siteData').set(data);
    console.log('✅ Данные сохранены в Firebase');
    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка сохранения в Firebase:', error);
    return { success: false, message: error.message || String(error) };
  }
}

// Слушать изменения в реальном времени
function watchDataChanges(callback) {
  if (!db) {
    console.warn('⚠️ Firebase не инициализирован, изменения не будут отслеживаться');
    return;
  }

  db.ref('siteData').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
}

// Стандартные данные
function getDefaultData() {
  return {
    categories: [
      {
        id: "live",
        icon: "🦞",
        title: "Живі раки",
        type: "table",
        items: [
          { name: "500 г", price: "450 грн" },
          { name: "1 кг", price: "850 грн" },
          { name: "2 кг", price: "1600 грн" }
        ]
      },
      {
        id: "cooked",
        icon: "🍲",
        title: "Варені раки",
        type: "table",
        items: [
          { name: "1 кг", price: "1500 грн" },
          { name: "3 кг", price: "4000 грн" },
          { name: "5 кг", price: "6000 грн" }
        ]
      }
    ],
    extras: [
      { name: "Пиво", description: "Холодне пиво до раків. Відмінний варіант для компанії.", price: "від 60 грн за пляшку" },
      { name: "Закуски", description: "До пива та раків: солоні крекери, горішки, лимон.", price: "від 40 грн" },
      { name: "Риба", description: "Рибні страви та свіжа охолоджена риба на додаток до раків.", price: "від 120 грн" }
    ],
    deliveryText: "Доставка по Києву 250 грн при замовленні від 3 кг варених або 5 живих — доставка безкоштовно.",
    workingHours: "Працюємо щодня з 10:00 до 20:00"
  };
}
