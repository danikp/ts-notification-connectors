# FCM Push Connector

Firebase Cloud Messaging v1 push connector using service account JWT authentication.

## Config

| Field       | Type     | Required | Description                                 |
|-------------|----------|----------|---------------------------------------------|
| `projectId` | `string` | Yes      | Firebase project ID                         |
| `email`     | `string` | Yes      | Service account email (`client_email`)      |
| `secretKey` | `string` | Yes      | PEM-encoded RSA private key (`private_key`) |

## Features

### Token Caching

OAuth2 access tokens are cached per connector instance until 5 minutes before expiry. Each instance maintains its own cache, supporting multiple credentials in the same process.

### Notification vs Data Messages

Control message type via `overrides.type`:

```typescript
// Notification message (default) — uses message.notification
await fcm.sendMessage({ ...options });

// Data message — title/body/payload go into message.data
await fcm.sendMessage({ ...options, overrides: { type: 'data' } });
```

### Multi-Token Delivery

FCM v1 has no native multicast. The connector sends one HTTP call per target token using `Promise.allSettled()`. Partial failures return error messages in the `ids` array instead of throwing.

### Topic-Based Delivery

Set `topic` via passthrough to send to a topic instead of device tokens:

```typescript
await fcm.sendMessage(options, {
  _passthrough: { body: { topic: 'breaking-news' } },
});
```

### Platform Overrides

Pass `android`, `apns`, `fcmOptions`, and `webPush` through `overrides` for platform-specific configuration.

## API

- **Endpoint:** `POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
- **Auth:** OAuth2 Bearer token from service account JWT
- **Provider ID:** `fcm` (matches `PushProviderIdEnum.FCM`)
