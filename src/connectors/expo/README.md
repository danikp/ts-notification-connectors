# Expo Push Connector

Expo Push Notifications connector using the Expo Push API.

## Config

| Field         | Type     | Required | Description                                              |
|---------------|----------|----------|----------------------------------------------------------|
| `accessToken` | `string` | No       | Expo access token (required if push security is enabled) |

## Features

### Optional Authentication

Expo Push API does not require authentication by default. Set `accessToken` only if push security is enabled in your Expo project settings.

### Multi-Token Delivery

The connector sends one message per target token. Partial failures are returned in the `ids` array (error messages for failed tokens). Only throws `ConnectorError` when all tokens fail.

### Overrides

Pass `sound`, `badge`, and other Expo-specific fields via `overrides`:

```typescript
await expo.sendMessage({
  ...options,
  overrides: { sound: 'default', badge: 5 },
});
```

### Passthrough

Use `_passthrough.body` for additional Expo fields like `priority`, `ttl`, `channelId`, `subtitle`, `categoryId`.

## API

- **Endpoint:** `POST https://exp.host/--/api/v2/push/send`
- **Auth:** Bearer token (optional)
- **Format:** JSON
- **Token format:** `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- **Provider ID:** `expo` (matches `PushProviderIdEnum.EXPO`)
