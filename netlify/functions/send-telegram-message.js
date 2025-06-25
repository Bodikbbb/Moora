// netlify/functions/send-telegram-message.js
// ЭТОТ КОД БУДЕТ ВЫПОЛНЯТЬСЯ НА СЕРВЕРЕ NETLIFY, А НЕ В БРАУЗЕРЕ!

// --- 1. ВАШИ СЕКРЕТНЫЕ ДАННЫЕ (НЕ ЗАБУДЬТЕ ЗАМЕНИТЬ!) ---
// Получите этот токен от @BotFather в Telegram
// ВАЖНО: Мы НЕ будем вставлять токен прямо сюда!
// Его нужно хранить в переменных окружения Netlify. Подробнее ниже.

// Список Chat ID получателей.
// Добавьте все Chat ID, куда должны приходить сообщения.
const RECIPIENT_CHAT_IDS = [
    'ВАШ_ЛИЧНЫЙ_ЧАТ_ID_ЗДЕСЬ',       // Пример: '1234567890' <--- ЗАМЕНИТЕ НА СВОЙ ID
    'ВТОРОЙ_ЧЕЛОВЕК_ЧАТ_ID_ЗДЕСЬ',   // Пример: '9876543210' <--- ЗАМЕНИТЕ НА ID ВТОРОГО ЧЕЛОВЕКА
    // Добавьте сюда другие Chat ID, если нужно (через запятую):
    // '-1001122334455', // Пример ID группы/канала
];
// --- КОНЕЦ СЕКРЕТНЫХ ДАННЫХ ---


// Главная функция, которую будет вызывать Netlify Function
exports.handler = async (event, context) => {
    // 2. Проверяем, что запрос пришел методом POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Метод не разрешен
            body: JSON.stringify({ success: false, message: 'Метод запроса должен быть POST.' }),
        };
    }

    // 3. Получаем JSON-данные из тела запроса
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400, // Плохой запрос
            body: JSON.stringify({ success: false, message: 'Некорректный JSON в теле запроса.' }),
        };
    }

    // Проверяем, что данные содержат нужные поля
    if (!data.name || !data.email || !data.message) {
        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, message: 'Не все обязательные поля формы заполнены.' }),
        };
    }

    // 4. Получаем токен бота из переменных окружения Netlify
    // Это БЕЗОПАСНЫЙ способ хранения секрета!
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Токен Telegram бота не настроен на сервере.' }),
        };
    }

    // 5. Формируем текст сообщения для Telegram
    const telegram_message = `<b>Нове повідомлення з сайту Calestia:</b>\n\n` +
                             `<b>Ім'я:</b> ${escapeHtml(data.name)}\n` +
                             `<b>Email:</b> ${escapeHtml(data.email)}\n` +
                             `<b>Повідомлення:</b> ${escapeHtml(data.message)}`;

    const all_success = true;
    const results = [];

    // 6. Отправка сообщения каждому получателю
    for (const chatId of RECIPIENT_CHAT_IDS) {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const postData = {
            chat_id: chatId,
            text: telegram_message,
            parse_mode: 'HTML',
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData),
            });

            const result = await response.json();

            if (response.ok && result.ok) {
                results.push({ chatId, success: true });
            } else {
                results.push({ chatId, success: false, error: result.description || 'Неизвестная ошибка' });
                all_success = false;
            }
        } catch (error) {
            console.error(`Ошибка при отправке сообщения в чат ${chatId}:`, error);
            results.push({ chatId, success: false, error: error.message });
            all_success = false;
        }
    }

    // 7. Отправка ответа обратно на ваш сайт
    if (all_success) {
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Повідомлення успішно надіслано всім отримувачам.' }),
        };
    } else {
        return {
            statusCode: 500, // Внутренняя ошибка сервера
            body: JSON.stringify({ success: false, message: 'Виникла помилка під час відправлення деяким отримувачам.', details: results }),
        };
    }
};

// Вспомогательная функция для очистки HTML-сущностей (защита от инъекций)
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
