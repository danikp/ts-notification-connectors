# OneSignal Push Connector

OneSignal push connector using REST API key authentication.

## Config

| Field    | Type     | Required | Description             |
|----------|----------|----------|-------------------------|
| `appId`  | `string` | Yes      | OneSignal application ID |
| `apiKey` | `string` | Yes      | OneSignal REST API key   |

## Features

### Native Multi-Token Delivery

Target tokens are sent as `include_subscription_ids` in a single API call, so OneSignal handles fan-out server-side.

### Passthrough

Use `_passthrough.body` to add OneSignal-specific fields like `segments`, `filters`, `url`, `big_picture`, or scheduling options.

## Quirks

### Error Response Handling

OneSignal may return HTTP 200 with an `errors` array instead of a notification `id`. The connector checks for a missing `id` and throws a `ConnectorError` with the joined error messages.

## API

- **Endpoint:** `POST https://api.onesignal.com/notifications`
- **Auth:** `Key {apiKey}` in Authorization header
- **Provider ID:** `one-signal` (matches `PushProviderIdEnum.ONE_SIGNAL`)
- **API Reference:** [OneSignal Create Notification API](https://documentation.onesignal.com/reference/create-notification)
