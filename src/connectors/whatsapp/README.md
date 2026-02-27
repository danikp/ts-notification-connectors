# WhatsApp Business Chat Connector

WhatsApp Business connector using the Cloud API via Meta's Graph API.

## Config

| Field           | Type     | Required | Description                              |
|-----------------|----------|----------|------------------------------------------|
| `accessToken`   | `string` | Yes      | Meta Graph API access token              |
| `phoneNumberId` | `string` | Yes      | WhatsApp Business phone number ID        |

## Features

### Text Messages
Sends text messages with `messaging_product: 'whatsapp'` and `type: 'text'`.

### Template Messages
Override via `_passthrough.body` to send template messages by setting `type: 'template'` and providing the `template` object.

### Passthrough
Use `_passthrough.body` to add WhatsApp-specific fields like `template`, `interactive`, `image`, or override `type`.

## API
- **Endpoint:** `POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
- **Auth:** Bearer token
- **Format:** JSON
- **Provider ID:** `whatsapp-business` (matches `ChatProviderIdEnum.WhatsAppBusiness`)
