# InterviewBot

AI UX-интервьюер: задаёт вопрос про выбор онлайн-курса, уточняет поверхностные ответы и завершает диалог когда получил достаточно информации.

**Стек:** FastAPI · OpenRouter (GPT-4.1) · React · TypeScript · Tailwind CSS · Framer Motion · Docker

---

## Быстрый старт (Docker)

Самый простой способ — один файл `.env` и одна команда.

### 1. Клонировать репо

```bash
git clone https://github.com/yarolys/interviewbot.git
cd interviewbot
```

### 2. Создать `.env` с API ключом

```bash
cp backend/.env.example backend/.env
```

Открыть `backend/.env` и вставить ключ:

```env
OPENAI_API_KEY=sk-or-...   # ключ с openrouter.ai
```

Опционально — поменять модель (по умолчанию `openai/gpt-4.1`):

```env
MODEL_NAME=anthropic/claude-sonnet-4-5
```

### 3. Запустить

```bash
docker compose up -d
```

Открыть [http://localhost:3000](http://localhost:3000)

### Остановить

```bash
docker compose down
```

### Пересобрать после изменений кода

```bash
docker compose up -d --build
```

---

## Запуск без Docker (dev режим)

Нужны: Python 3.12+, [uv](https://github.com/astral-sh/uv), Node.js 18+

### Бэкенд

```bash
cd backend
cp .env.example .env
# вставить OPENAI_API_KEY в .env

uv sync
uv run uvicorn main:app --reload
# работает на http://localhost:8000
```

### Фронтенд

```bash
cd frontend
npm install
npm run dev
# работает на http://localhost:5173
```

Открыть [http://localhost:5173](http://localhost:5173)

> В dev-режиме Vite проксирует `/api` запросы на `localhost:8000` автоматически — ничего дополнительно настраивать не нужно.

---

## Переменные окружения

Все переменные задаются в `backend/.env`:

| Переменная | Обязательная | По умолчанию | Описание |
|---|---|---|---|
| `OPENAI_API_KEY` | Да | — | API ключ OpenRouter |
| `MODEL_NAME` | Нет | `openai/gpt-4.1` | Модель через OpenRouter |

---

## Структура проекта

```
interviewbot/
├── backend/
│   ├── main.py          # FastAPI: /initial-question, /chat/stream (SSE)
│   ├── pyproject.toml   # Python зависимости (uv)
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Главный компонент, логика чата
│   │   ├── api.ts           # Fetch + SSE стриминг
│   │   ├── types.ts
│   │   └── components/
│   │       ├── ChatMessage.tsx
│   │       └── TypingIndicator.tsx
│   ├── nginx.conf       # Прокси /api → backend в Docker
│   └── Dockerfile
└── docker-compose.yml
```

---

## Как это работает

1. Пользователь открывает страницу — фронт запрашивает начальный вопрос с бэкенда
2. Пользователь пишет ответ — он отправляется на `POST /chat/stream`
3. Бэкенд передаёт историю диалога в LLM с системным промптом исследователя
4. Ответ модели стримится обратно через SSE (Server-Sent Events) — текст появляется по мере генерации
5. Бэкенд анализирует полный ответ: если модель поблагодарила и завершила — шлёт `{"done": true}` и интервью закрывается

---

## Решение по системному промпту

Промпт написан от лица **UX-исследователя**, не нейтрального бота — это даёт естественный тон разговора.

Ключевые принципы:
- **Один вопрос за раз** — модель не заваливает несколькими вопросами одновременно
- **Чёткий критерий "подробности"** — конкретика: критерии выбора, сомнения, сравнение вариантов, эмоции
- **Детекция завершения на бэкенде** — бэкенд анализирует ответ и сам решает когда слать `done`, модель об этом не знает и не пишет служебные маркеры в текст
- **Тёплый тон** — без формализма, чтобы снизить барьер откровенности

Почему `gpt-4.1` через OpenRouter: быстрый, хорошо следует инструкциям на русском, стриминг без задержек.

---

## Возможные проблемы

**Порт 3000 занят**

Поменять порт в `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # вместо 3000:80
```

**Бэкенд не стартует — ошибка API ключа**

Проверить что `backend/.env` существует и содержит валидный `OPENAI_API_KEY`.

**Модель недоступна на OpenRouter**

Поменять `MODEL_NAME` в `.env` на другую, например `openai/gpt-4o-mini`.

**Фронт не видит бэкенд в dev-режиме**

Убедиться что бэкенд запущен на порту 8000. Прокси настроен в `frontend/vite.config.ts`.
