import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { WhatsAppChatConnector } from './whatsapp.connector';
import type { WhatsAppConfig } from './whatsapp.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: WhatsAppConfig = {
  accessToken: 'wa-access-token-123',
  phoneNumberId: '1234567890',
};

function buildSuccessResponse() {
  return {
    data: {
      messages: [{ id: 'wamid.HBgNMTIzNDU2Nzg5MA==' }],
    },
  };
}

describe('WhatsAppChatConnector', () => {
  let connector: WhatsAppChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new WhatsAppChatConnector(defaultConfig);
  });

  it('should have id "whatsapp-business" and channelType CHAT', () => {
    expect(connector.id).toBe('whatsapp-business');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a text message with Bearer auth', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      channel: '14155550100',
      content: 'Hello from WhatsApp!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://graph.facebook.com/v21.0/1234567890/messages'
    );

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer wa-access-token-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.messaging_product).toBe('whatsapp');
    expect(parsedBody.to).toBe('14155550100');
    expect(parsedBody.type).toBe('text');
    expect(parsedBody.text).toEqual({ body: 'Hello from WhatsApp!' });

    expect(result).toEqual({
      id: 'wamid.HBgNMTIzNDU2Nzg5MA==',
      date: expect.any(String),
    });
  });

  it('should extract message ID from response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { messages: [{ id: 'wamid.custom-id' }] },
    });

    const result = await connector.sendMessage({
      channel: '14155550100',
      content: 'Test',
    });

    expect(result.id).toBe('wamid.custom-id');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { channel: '14155550100', content: 'Hello!' },
      {
        _passthrough: {
          body: {
            type: 'template',
            template: { name: 'hello_world', language: { code: 'en_US' } },
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.template).toEqual({
      name: 'hello_world',
      language: { code: 'en_US' },
    });
    expect(parsedBody.type).toBe('template');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 400,
        data: {
          error: {
            message: 'Invalid parameter',
            code: 100,
          },
        },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        channel: '14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.providerMessage).toBe('Invalid parameter');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        channel: '14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
