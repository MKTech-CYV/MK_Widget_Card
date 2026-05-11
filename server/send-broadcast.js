/* eslint-disable no-console */
// Usage:
// 1) Collect tokens in your own DB (recommended), then load them here.
// 2) Run:
//    node server/send-broadcast.js --title "Hello" --body "Test" --tokens token1,token2
//
// Notes:
// - This uses Expo Push API (no FCM/APNs credentials needed for basic usage).
// - In production, you should store tokens server-side and expose an admin-only endpoint.

const { Expo } = require('expo-server-sdk');

function arg(name, fallback = '') {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

async function main() {
  const title = arg('--title', 'MK eCard');
  const body = arg('--body', 'Hello!');
  const tokensRaw = arg('--tokens', '');
  const tokens = tokensRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (!tokens.length) {
    console.error('Missing --tokens (comma-separated Expo push tokens).');
    process.exit(1);
  }

  const expo = new Expo();
  const messages = tokens
    .filter(token => Expo.isExpoPushToken(token))
    .map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { title, body },
    }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
    tickets.push(...ticketChunk);
  }

  console.log('Tickets:', tickets);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

