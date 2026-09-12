const priceBySize = {
  '40': 1500,
  '70': 2400,
  '70+': 3300,
};

const cart = [];

function formatMoney(value) {
  return `${Math.round(value)} грн`;
}

function updateCrabTotal(order) {
  const size = order.querySelector('.size-select').value;
  const weight = Number(order.querySelector('.weight-select').value);
  const total = priceBySize[size] * weight;
  order.querySelector('.order-total').textContent = formatMoney(total);
}

function renderCart() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartCountEl = document.getElementById('cart-count');
  const cartTotalEl = document.getElementById('cart-total');

  if (!cartItemsEl) return;

  cartItemsEl.innerHTML = '';

  let total = 0;

  cart.forEach((item, index) => {
    const itemRow = document.createElement('div');
    itemRow.className = 'cart-item';
    itemRow.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <small>${item.size} • ${item.quantity} ${item.unit}</small>
      </div>
      <div class="cart-item-actions">
        <strong>${formatMoney(item.price)}</strong>
        <button class="remove-cart-item" type="button" data-index="${index}" aria-label="Видалити ${item.title}">×</button>
      </div>
    `;
    cartItemsEl.appendChild(itemRow);
    total += item.price;
  });

  cartCountEl.textContent = String(cart.length);
  cartTotalEl.textContent = formatMoney(total);

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<div class="cart-item"><div><strong>Кошик порожній</strong></div></div>';
  }
}

function addToCart(item) {
  cart.push(item);
  renderCart();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.crab-order').forEach((order) => {
    const sizeSelect = order.querySelector('.size-select');
    const weightSelect = order.querySelector('.weight-select');

    updateCrabTotal(order);

    sizeSelect.addEventListener('change', () => updateCrabTotal(order));
    weightSelect.addEventListener('change', () => updateCrabTotal(order));

    const addButton = order.querySelector('.add-cart-btn');

    addButton.addEventListener('click', () => {
      const title = addButton.dataset.title;
      const size = sizeSelect.options[sizeSelect.selectedIndex].text;
      const weight = Number(weightSelect.value);
      const price = Number(order.querySelector('.order-total').textContent.replace(/\D/g, ''));

      addToCart({
        title,
        size,
        quantity: weight,
        unit: 'кг',
        price,
      });
    });
  });

  document.querySelectorAll('.cart-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.extra-item');
      const title = item.querySelector('span').textContent.trim();
      const priceText = item.querySelector('strong').textContent.trim();
      const price = Number(priceText.replace(/\D/g, ''));

      addToCart({
        title,
        size: 'доповнення',
        quantity: 1,
        unit: button.dataset.unit || 'порція',
        price,
      });
    });
  });

  const cartToggle = document.getElementById('cart-toggle');
  const cartPanel = document.getElementById('cart-panel');

  cartToggle?.addEventListener('click', () => {
    const isOpen = cartToggle.getAttribute('aria-expanded') === 'true';
    cartToggle.setAttribute('aria-expanded', String(!isOpen));
    cartPanel.hidden = isOpen;
  });

  document.getElementById('clear-cart')?.addEventListener('click', () => {
    cart.length = 0;
    renderCart();
  });

  document.getElementById('cart-items')?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.remove-cart-item');
    if (!removeButton) return;

    cart.splice(Number(removeButton.dataset.index), 1);
    renderCart();
  });

  const checkoutToggle = document.getElementById('checkout-toggle');
  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutClose = document.getElementById('checkout-close');
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutStatus = document.getElementById('checkout-status');
  const checkoutPhone = document.getElementById('checkout-phone');
  const orderApiUrl = window.ORDER_API_URL || 'https://paki-kyiv-shop.onrender.com/api/order';
  const savedPhone = localStorage.getItem('checkout-phone');

  if (savedPhone && checkoutPhone) {
    checkoutPhone.value = savedPhone.startsWith('+380') ? savedPhone : `+380${savedPhone.replace(/\D/g, '').slice(-9)}`;
  }

  checkoutPhone?.addEventListener('input', () => {
    const digits = checkoutPhone.value.replace(/\D/g, '').replace(/^380/, '').slice(0, 9);
    checkoutPhone.value = `+380${digits}`;
    localStorage.setItem('checkout-phone', checkoutPhone.value);
  });

  checkoutPhone?.addEventListener('keydown', (event) => {
    if (checkoutPhone.selectionStart <= 4 && ['Backspace', 'Delete', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      checkoutPhone.setSelectionRange(4, 4);
    }
  });

  checkoutToggle?.addEventListener('click', () => {
    if (cart.length === 0) {
      checkoutToggle.textContent = 'Додайте товар у кошик';
      window.setTimeout(() => {
        checkoutToggle.textContent = 'Оформити замовлення';
      }, 1800);
      return;
    }

    checkoutModal.hidden = false;
    checkoutStatus.textContent = '';
    checkoutForm.querySelector('input')?.focus();
  });

  const closeCheckoutModal = () => {
    checkoutModal.hidden = true;
  };

  checkoutClose?.addEventListener('click', closeCheckoutModal);
  checkoutModal?.addEventListener('click', (event) => {
    if (event.target === checkoutModal) closeCheckoutModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && checkoutModal && !checkoutModal.hidden) closeCheckoutModal();
  });

  checkoutForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = checkoutForm.querySelector('.checkout-submit');
    const formData = new FormData(checkoutForm);
    const phone = String(formData.get('phone') || '');

    if (!/^\+380\d{9}$/.test(phone)) {
      checkoutPhone?.focus();
      checkoutStatus.textContent = 'Введіть 9 цифр після +380.';
      return;
    }

    const order = {
      customer: {
        phone,
      },
      items: cart,
    };

    submitButton.disabled = true;
    checkoutStatus.textContent = 'Надсилаємо замовлення...';

    try {
      const response = await fetch(orderApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json')
        ? await response.json()
        : { error: 'Сервіс замовлень недоступний на цьому сайті.' };

      if (!response.ok) throw new Error(result.error || 'Не вдалося надіслати замовлення');

      cart.length = 0;
      checkoutPhone.value = phone;
      localStorage.setItem('checkout-phone', phone);
      checkoutStatus.textContent = 'Дякуємо! Ми скоро зателефонуємо вам.';
      renderCart();
    } catch (error) {
      checkoutStatus.textContent = error.message || 'Не вдалося надіслати замовлення. Спробуйте ще раз.';
    } finally {
      submitButton.disabled = false;
    }
  });

  renderCart();
});
