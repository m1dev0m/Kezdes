# Kezdes Mobile (React Native / Expo)

Цель: стабильный запуск на Android + iPhone без редизайна.

## Быстрый старт (локально)

1) Подними backend на ноутбуке (порт `8000`):
- `cd backend && python manage.py runserver 0.0.0.0:8000`

2) Запусти mobile:
- `cd mobile-rn`
- `npm i`
- `npm run start`

По умолчанию `API_BASE_URL` в dev автоматически берётся из Expo host (IP ноутбука) и будет работать на реальном iPhone в одной Wi‑Fi сети.

## Важно про iPhone на Linux

- iOS Simulator на Linux **невозможен**.
- На iPhone можно запускать через:
  - **Expo Go** (быстро для разработки)
  - **EAS Build** (dev/preview/prod сборки в облаке)

Если ты запускаешь через Expo Go:
- Убедись, что iPhone и ноутбук в одной сети
- Backend должен слушать `0.0.0.0:8000`
- Фаервол должен пропускать входящие на `8000`

## Настройка API URL (если авто‑детект не подходит)

Expo может работать в режиме tunnel (тогда авто‑детект IP не поможет). В этом случае нужно явно задать API:

- Временно в терминале:
  - `EXPO_PUBLIC_API_URL=https://<public-host>/api/v1 npm run start`
- Или в `mobile-rn/.env.local` (файл не коммитится):
  - `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api/v1`

## Команды

- `npm run android` — открыть Android emulator (если установлен)
- `npm run web` — web-версия (metro)
- `npm run typecheck` — проверка TypeScript

## EAS Build (Android + iOS)

Требования:
- аккаунт Expo + установленный `eas-cli`
- Apple Developer Program для iOS (и TestFlight/App Store)
- Google Play Console для Android

Команды:
- `cd mobile-rn`
- `npx eas login`
- `npx eas build --platform android --profile development`
- `npx eas build --platform ios --profile development`

Для публикации:
- iOS: TestFlight → App Store (`eas submit -p ios`)
- Android: Play Console (`eas submit -p android`)

