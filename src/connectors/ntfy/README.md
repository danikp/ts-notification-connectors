# ntfy Push Connector

ntfy push connector using optional Bearer token authentication with topic-based delivery.

## Config

| Field          | Type     | Required | Description                                              |
|----------------|----------|----------|----------------------------------------------------------|
| `baseUrl`      | `string` | No       | ntfy server URL (defaults to `https://ntfy.sh`)          |
| `token`        | `string` | No       | Access token for authenticated ntfy servers               |
| `defaultTopic` | `string` | No       | Fallback topic when no target topics are provided         |

## Features

### Self-Hosted Support

Set `baseUrl` to point at a self-hosted ntfy instance instead of the public `https://ntfy.sh` server.

### Multi-Topic Delivery

The connector sends one HTTP call per target topic using `Promise.allSettled()`. Partial failures return error messages in the `ids` array instead of throwing.

### Default Topic Fallback

When `options.target` is empty, the connector falls back to `defaultTopic` from config. If neither is set, it throws a `ConnectorError`.

### Passthrough

Use `_passthrough.body` to add ntfy-specific fields like `priority`, `tags`, `click`, `attach`, `actions`, or `email`.

## API

- **Endpoint:** `POST {baseUrl}` (defaults to `https://ntfy.sh`)
- **Auth:** Bearer token (optional, only sent when `token` is configured)
- **Provider ID:** `ntfy` (matches `PushProviderIdEnum.NTFY`)
- **API Reference:** [ntfy Publishing API](https://docs.ntfy.sh/publish/)
