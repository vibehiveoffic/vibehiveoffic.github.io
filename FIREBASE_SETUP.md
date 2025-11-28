# Настройка Firebase для VibeHive

## Шаг 1: Настройка Realtime Database

1. Перейди в Firebase Console: https://console.firebase.google.com/project/vibehive-2aca0
2. В левом меню выбери **Realtime Database**
3. Нажми **Create Database**
4. Выбери регион (например, `us-central1`)
5. Выбери **Start in test mode** (для разработки)
6. Нажми **Enable**

## Шаг 2: Настройка Authentication

1. В левом меню выбери **Authentication**
2. Перейди на вкладку **Sign-in method**
3. Включи **Email/Password**:
   - Нажми на Email/Password
   - Включи переключатель **Enable**
   - Нажми **Save**

## Шаг 3: Настройка правил безопасности

### Realtime Database Rules

Перейди в **Realtime Database** → вкладка **Rules** и замени правила на:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    },
    "usernames": {
      ".read": true,
      "$username": {
        ".write": "!data.exists()"
      }
    },
    "posts": {
      ".read": true,
      "$postId": {
        ".write": "auth != null"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null && (data.child('participants').child(auth.uid).exists())",
        ".write": "auth != null && (data.child('participants').child(auth.uid).exists() || !data.exists())",
        "messages": {
          "$messageId": {
            ".write": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()"
          }
        }
      }
    }
  }
}
```

Нажми **Publish**

## Шаг 4: Проверка databaseURL

В файле `firebase.js` убедись, что `databaseURL` правильный:
```javascript
databaseURL: "https://vibehive-2aca0-default-rtdb.firebaseio.com"
```

Если регион другой, URL может быть:
- `https://vibehive-2aca0-default-rtdb.europe-west1.firebasedatabase.app`
- `https://vibehive-2aca0-default-rtdb.asia-southeast1.firebasedatabase.app`

Проверь правильный URL в Firebase Console → Realtime Database → вверху страницы.

## Готово!

Теперь приложение будет синхронизировать данные между всеми устройствами в реальном времени! 🎉

### Тестирование:
1. Зарегистрируй аккаунт на одном устройстве
2. Войди с тем же аккаунтом на другом устройстве
3. Отправь сообщение - оно появится на обоих устройствах мгновенно!
