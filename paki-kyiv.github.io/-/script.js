// Ініціалізація при загрузці сторінки
document.addEventListener('DOMContentLoaded', initializeSite);

async function initializeSite() {
  try {
    console.log('🌍 Завантаження сайту...');
    
    if (typeof loadDataFromFirebase !== 'function') {
      throw new Error('firebase-config.js не завантажено!');
    }
    
    const data = await loadDataFromFirebase() || getDefaultData();
    updateAllSections(data);
    console.log('✅ Сайт завантажено успішно!');

    watchDataChanges((updatedData) => {
      updateAllSections(updatedData);
      console.log('✅ Дані оновилися на сайті!');
    });
  } catch (error) {
    console.error('❌ Ошибка инициализации сайта:', error);
  }
}

// Обновить всі секції
function updateAllSections(data) {
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  
  // Оновити існуючі таблиці та динамічні секції
  categories.forEach(cat => {
    updateCategorySection(cat);
  });

  // Прибрати стару секцію #categories якщо вона існує
  const oldCategoriesSection = document.getElementById('categories');
  if (oldCategoriesSection) {
    oldCategoriesSection.style.display = 'none';
  }

  updateExtras(data);
  updateDeliveryText(data);
  updateWorkingHours(data);
}

// Обновить одну категорію
function updateCategorySection(category) {
  const items = Array.isArray(category?.items) ? category.items : [];
  const sectionId = category.id;
  const type = category.type || 'table'; // За замовчуванням - таблиця
  
  let section = document.querySelector(`#${sectionId}`);

  // Для таблиць (live, cooked) - обновити існуючу секцію
  if (type === 'table') {
    if (!section) return;
    
    const table = section.querySelector('.price-table tbody');
    if (table) {
      table.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${item.name}</td><td>${item.price}</td>`;
        table.appendChild(row);
      });
    }
  }
  // Для сітки (рецепти, мідії) - створити/оновити динамічну секцію
  else if (type === 'grid') {
    // Якщо секція не існує - створити
    if (!section) {
      section = document.createElement('section');
      section.className = 'section-card';
      section.id = sectionId;
      
      // Додати після секції extras
      const extrasSection = document.querySelector('#extras');
      if (extrasSection) {
        extrasSection.insertAdjacentElement('afterend', section);
      } else {
        document.querySelector('main').appendChild(section);
      }
    }

    // Оновити вміст секції
    section.innerHTML = `
      <h2>${category.icon} ${category.title}</h2>
      <div class="info-grid" id="${sectionId}-grid"></div>
    `;

    const grid = section.querySelector(`#${sectionId}-grid`);
    items.forEach(item => {
      const article = document.createElement('article');
      article.innerHTML = `
        ${item.photo ? `<div class="card-image-wrapper"><img src="${item.photo}" alt="${item.name}" onerror="this.parentElement.style.display='none'" /></div>` : ''}
        <h3>${item.name}</h3>
        ${item.description ? `<p>${item.description}</p>` : ''}
        <p class="price">${item.price}</p>
      `;
      grid.appendChild(article);
    });
  }
}

// Обновить доповнення
function updateExtras(data) {
  const extrasGrid = document.querySelector('#extras .info-grid');
  const extras = Array.isArray(data?.extras) ? data.extras : [];

  if (extrasGrid) {
    extrasGrid.innerHTML = '';
    extras.forEach(item => {
      const article = document.createElement('article');
      article.innerHTML = `
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <p class="price">${item.price}</p>
      `;
      extrasGrid.appendChild(article);
    });
  }
}

// Обновить текст доставки
function updateDeliveryText(data) {
  const deliverySection = document.querySelector('#delivery p');
  if (deliverySection) {
    deliverySection.textContent = data.deliveryText;
  }
}

// Обновить часы роботы
function updateWorkingHours(data) {
  const hoursElement = document.querySelector('.working-hours');
  if (hoursElement) {
    hoursElement.textContent = data.workingHours;
  }
}
