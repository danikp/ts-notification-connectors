# APNs Push Connector

Apple Push Notification service connector using HTTP/2 with ES256 JWT authentication.

## Config

| Field        | Type      | Required | Description                                      |
|--------------|-----------|----------|--------------------------------------------------|
| `key`        | `string`  | Yes      | `.p8` private key content (PEM-encoded PKCS#8)   |
| `keyId`      | `string`  | Yes      | 10-character Key ID from Apple Developer portal  |
| `teamId`     | `string`  | Yes      | 10-character Team ID from Apple Developer portal |
| `bundleId`   | `string`  | Yes      | App bundle identifier (e.g., `com.example.app`)  |
| `production` | `boolean` | No       | Use production endpoint (defaults to `true`)     |

## Features

### HTTP/2

APNs requires HTTP/2. The connector uses Node's built-in `http2` module (no additional dependencies). A single HTTP/2 session is shared across all device tokens within a `sendMessage` call.

### JWT Token Caching

ES256 JWTs are cached per connector instance for 50 minutes (APNs tokens are valid for 1 hour). Signing uses Node's built-in `crypto.sign()` with `ieee-p1363` encoding.

### Multi-Token Delivery

One HTTP/2 request per device token via `Promise.allSettled()`. Partial failures return error reasons in the `ids` array. Only throws `ConnectorError` when all tokens fail.

### Custom Payload

Data from `options.payload` is spread into the top-level APNs payload alongside the `aps` dictionary.

### Overrides

Pass `sound`, `badge`, and display overrides via `overrides`:

```typescript
await apns.sendMessage({
  ...options,
  overrides: { sound: 'default', badge: 3 },
});
```

## API

- **Endpoint:** `POST https://api.push.apple.com/3/device/{deviceToken}` (HTTP/2)
- **Sandbox:** `POST https://api.sandbox.push.apple.com/3/device/{deviceToken}`
- **Auth:** Bearer JWT (ES256)
- **Format:** JSON
- **Response:** HTTP 200 with empty body; `apns-id` in response header
- **Provider ID:** `apns` (matches `PushProviderIdEnum.APNS`)
