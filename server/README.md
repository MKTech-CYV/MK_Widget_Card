## Push notifications (broadcast)

This app registers an **Expo Push Token** on the device via `expo-notifications`.

### Sending a broadcast

You need a list of Expo push tokens (one per user/device). In production you should collect and store them on a server.

For local/manual testing you can send directly with:

```bash
node server/send-broadcast.js --title "MK eCard" --body "Hello everyone" --tokens ExpoPushToken[xxx],ExpoPushToken[yyy]
```

### Important

- If you add `expo-notifications` to the app, you must **rebuild** native binaries (dev build / EAS build / `expo run:*`).
- Expo push tokens are **not stable forever** (reinstall can change them). Always allow re-registering and updating tokens.

