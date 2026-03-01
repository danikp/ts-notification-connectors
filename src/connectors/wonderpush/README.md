# WonderPush Push Connector

WonderPush push connector using query parameter access token authentication with form-encoded requests.

## Config

| Field         | Type     | Required | Description                       |
|---------------|----------|----------|-----------------------------------|
| `accessToken` | `string` | Yes      | WonderPush Management API access token |

## Features

### User-Targeted Delivery

Target user IDs are joined into a comma-separated string and sent as `targetUserIds` in a single API call.

### JSON Notification Payload

The notification content is sent as a JSON-encoded `notification` field containing an `alert` object with `title` and `text`.

### Passthrough

Use `_passthrough.body` to add WonderPush-specific fields like `targetSegmentIds`, `targetInstallationIds`, or additional notification properties.

## API

- **Endpoint:** `POST https://management-api.wonderpush.com/v1/deliveries?accessToken={accessToken}`
- **Auth:** Access token as query parameter
- **Format:** `application/x-www-form-urlencoded`
- **Provider ID:** `wonderpush` (matches `PushProviderIdEnum.WONDERPUSH`)
- **API Reference:** [WonderPush Deliveries API](https://docs.wonderpush.com/reference/post-deliveries)
