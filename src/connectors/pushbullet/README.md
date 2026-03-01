# Pushbullet Push Connector

Pushbullet push connector using `Access-Token` header authentication.

## Config

| Field         | Type     | Required | Description              |
|---------------|----------|----------|--------------------------|
| `accessToken` | `string` | Yes      | Pushbullet access token  |

## Features

### Multi-Device Delivery

The connector sends one HTTP call per target device identifier using `Promise.allSettled()`. Partial failures return error messages in the `ids` array instead of throwing.

### Note Push Type

All pushes are sent as `type: "note"` with a title and body. The device is targeted via `device_iden`.

### Passthrough

Use `_passthrough.body` to add Pushbullet-specific fields like `type` (to switch to `link` or `file`), `url`, `email`, or `channel_tag`.

## API

- **Endpoint:** `POST https://api.pushbullet.com/v2/pushes`
- **Auth:** `Access-Token` header
- **Provider ID:** `pushbullet` (matches `PushProviderIdEnum.PUSHBULLET`)
- **API Reference:** [Pushbullet Push API](https://docs.pushbullet.com/#create-push)
