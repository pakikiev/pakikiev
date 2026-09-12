const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  });
}

const port = Number(process.env.PORT || 8000);
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const rootDirectory = __dirname;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function escapeTelegramText(value) {
  return String(value).replace(/[<&>]/g, (character) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' })[character]);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Занадто великий запит'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Некоректний JSON'));
      }
    });
    request.on('error', reject);
  });
}

function makeTelegramMessage(order) {
  const items = order.items.map((item) => (
    `• ${escapeTelegramText(item.title)}: ${escapeTelegramText(item.quantity)} ${escapeTelegramText(item.unit)} - ${Math.round(Number(item.price))} грн`
  )).join('\n');
  const total = order.items.reduce((sum, item) => sum + Number(item.price), 0);

  return [
    '<b>Нове замовлення</b>',
    '',
    `<b>Телефон:</b> ${escapeTelegramText(order.customer.phone)}`,
    '',
    '<b>Замовлення:</b>',
    items,
    '',
    `<b>Разом: ${total} грн</b>`,
  ].join('\n');
}

async function handleOrder(request, response) {
  if (!botToken || !chatId) {
    sendJson(response, 500, { error: 'Telegram ще не налаштований на сервері' });
    return;
  }

  try {
    const order = await readRequestBody(request);
    const customer = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];

    if (!customer.phone || items.length === 0) {
      sendJson(response, 400, { error: 'Вкажіть номер телефону та додайте товари' });
      return;
    }

    if (items.some((item) => !item.title || !item.unit || !Number.isFinite(Number(item.price)))) {
      sendJson(response, 400, { error: 'Некоректні дані замовлення' });
      return;
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: makeTelegramMessage({ customer, items }),
        parse_mode: 'HTML',
      }),
    });

    if (!telegramResponse.ok) {
      const telegramError = await telegramResponse.json().catch(() => ({}));
      console.error('Telegram API error:', telegramError);
      sendJson(response, 502, { error: telegramError.description || 'Telegram не прийняв замовлення' });
      return;
    }

    sendJson(response, 200, { success: true });
  } catch (error) {
    sendJson(response, 400, { error: error.message || 'Некоректний запит' });
  }
}

function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.resolve(rootDirectory, relativePath);

  if (!filePath.startsWith(rootDirectory + path.sep)) {
    sendJson(response, 403, { error: 'Доступ заборонено' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  if (request.headers.origin === 'https://pakikiev.github.io') {
    response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'POST' && request.url === '/api/order') {
    handleOrder(request, response);
    return;
  }

  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }

  sendJson(response, 405, { error: 'Метод не підтримується' });
});

server.listen(port, () => {
  console.log(`Сайт запущено на http://localhost:${port}`);
});
