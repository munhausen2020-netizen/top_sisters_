# ИМЯ. — MVP рейтинга женских имён

Минималистичный ретро/DOS-сайт: пользователь находит имя, голосует за него один раз в сутки, рейтинг обновляется сразу.

## Что уже есть

- TOP-10 женских имён
- поиск по всем именам
- отдельная страница имени
- 1 голос на браузер/устройство в сутки
- мягкий антифрод по IP (до 80 голосов с одного IP в сутки, чтобы школа/офис не блокировались)
- очередь предложений для отсутствующих имён
- московский день для сброса лимита
- mobile-first ретро-терминальный дизайн
- Supabase как БД
- Vercel как хостинг

## Важно про уникальность голосов

MVP идентифицирует пользователя по серверной cookie + IP + User-Agent и хэширует идентификатор. Это не банковский антифрод: человек может обойти ограничение, очистив cookie, сменив браузер/VPN/устройство. Для пилота этого достаточно.

Если проект полетит, следующий уровень — Telegram/VK OAuth, где главным идентификатором становится account user_id.

---

# 1. Локальный запуск

Нужно: Node.js 20+ и npm.

```bash
npm install
cp .env.example .env.local
```

Пока не запускай `npm run dev`: сначала создай Supabase.

---

# 2. Supabase

1. Создай новый проект в Supabase.
2. Открой `SQL Editor`.
3. Создай новый query.
4. Вставь целиком файл `supabase/schema.sql`.
5. Нажми `Run`.
6. Открой `Connect` в проекте Supabase и скопируй:
   - Project URL
   - Secret key (`sb_secret_...`)

В `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxx
VOTE_HASH_SECRET=сюда-длинную-случайную-строку
```

`SUPABASE_SECRET_KEY` нельзя использовать в браузерном коде и нельзя коммитить в GitHub.

Сгенерировать VOTE_HASH_SECRET можно так:

```bash
openssl rand -hex 32
```

---

# 3. Проверить локально

```bash
npm run dev
```

Открыть:

http://localhost:3000

Проверь:

1. TOP-10 отображается.
2. Поиск находит имя.
3. Голос +1 проходит.
4. Второй голос в тот же день блокируется.
5. В Supabase `Table Editor -> votes` появилась запись.
6. Неизвестное имя через поиск можно предложить.

---

# 4. GitHub

В корне проекта:

```bash
git init
git add .
git commit -m "Initial name ranking MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/name-top.git
git push -u origin main
```

`.env.local` уже находится в `.gitignore`, поэтому секреты не улетят в GitHub.

---

# 5. Деплой на Vercel

Самый простой способ:

1. Зайди в Vercel.
2. `Add New -> Project`.
3. Импортируй GitHub-репозиторий `name-top`.
4. Framework должен определиться как Next.js.
5. В `Environment Variables` добавь:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
VOTE_HASH_SECRET
```

6. Нажми `Deploy`.

После каждого push в `main` Vercel будет собирать новую production-версию.

Альтернатива через CLI:

```bash
npm i -g vercel
vercel link
vercel
vercel --prod
```

---

# 6. Домен

Для пилота сначала используй бесплатный адрес `*.vercel.app`.

После проверки спроса:

1. Купи короткий домен.
2. Vercel -> Project -> Settings -> Domains.
3. Добавь домен.
4. Настрой DNS по инструкции Vercel.

Не откладывай пилот из-за домена.

---

# 7. Модерация новых имён

Очередь:

```sql
select *
from public.name_suggestions
where status = 'pending'
order by created_at;
```

Одобрение:

```sql
insert into public.names(name, slug)
values ('Адель', 'адель')
on conflict do nothing;

update public.name_suggestions
set status = 'approved', reviewed_at = now()
where normalized_name = 'адель';
```

Отклонение:

```sql
update public.name_suggestions
set status = 'rejected', reviewed_at = now()
where id = 123;
```

---

# 8. Что тестировать в первом пилоте

Не деньги. Сначала проверяем вирусность.

Минимальные события для аналитики:

- page_view
- search_name
- name_found
- name_not_found
- vote_attempt
- vote_success
- vote_blocked
- share_click
- suggest_name

Главные метрики:

- visitors -> vote_success
- доля вернувшихся на следующий день
- votes / unique visitors
- share rate
- сколько новых посетителей приходит по расшаренным ссылкам
- распределение голосов: есть ли настоящая борьба между несколькими именами

---

# 9. Что добавить после первого подтверждения спроса

1. Telegram/VK login для сильной уникальности.
2. Шаринг страницы имени с красивой OG-картинкой.
3. Рейтинг `Сегодня` и `Неделя`.
4. История движения позиции имени.
5. Админку вместо ручного SQL.
6. PostHog/Yandex Metrica.
7. CAPTCHA только если появится бот-накрутка.
8. Платные boost'ы — только после проверки юридической модели и эквайринга.

---

# 10. Антифрод: как усилить позже

Сейчас:

`server cookie + IP + User-Agent -> HMAC hash -> unique per Moscow date`

Потом:

`Telegram/VK user_id + device fingerprint + IP signals + rate limits`

Не делай строгий unique по IP: в школе сотни учеников могут сидеть через один внешний IP.
