# InforU SMS Connector

InforU Mobile SMS connector using the SendMessageXml API with XML request format.

## Config

| Field      | Type     | Required | Description              |
|------------|----------|----------|--------------------------|
| `username` | `string` | Yes      | InforU API username      |
| `password` | `string` | Yes      | InforU API password      |
| `from`     | `string` | Yes      | Default sender name      |

## Features

### Message Structure

The connector builds an XML body with `<Inforu>` root element containing `<User>`, `<Content>`, `<Recipients>`, and `<Settings>` sections. The XML is URL-encoded and sent as `InforuXML=<encoded-xml>` with `application/x-www-form-urlencoded`.

### XML Escaping

All user-provided content (message text, sender name, phone number, credentials) is XML-escaped to prevent injection.

### Error Handling

The API returns XML with `<Status>1</Status>` for success. Non-`1` status values are treated as errors.

### Message ID

This provider does not return a message ID. The `id` field in the response is `undefined`.

## API

- **Endpoint:** `POST https://api.inforu.co.il/SendMessageXml.ashx`
- **Auth:** Credentials in XML body (`<Username>`, `<Password>`)
- **Provider ID:** `unforu` (matches `SmsProviderIdEnum.Unforu`)
- **API Reference:** [InforU Mobile API Docs](https://apidoc.inforu.co.il/)
