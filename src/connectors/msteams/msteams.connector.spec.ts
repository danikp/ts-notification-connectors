import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MsTeamsChatConnector } from './msteams.connector';
import type { MsTeamsConfig } from './msteams.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: MsTeamsConfig = {
  webhookUrl: 'https://region.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?key=123',
};

describe('MsTeamsChatConnector', () => {
  let connector: MsTeamsChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new MsTeamsChatConnector(defaultConfig);
  });

  it('should have id "msteams" and channelType CHAT', () => {
    expect(connector.id).toBe('msteams');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send an Adaptive Card message and return { id: undefined, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '1' });

    const result = await connector.sendMessage({
      content: 'Hello from Teams!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(defaultConfig.webhookUrl);
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.type).toBe('message');
    const attachments = parsedBody.attachments as Array<Record<string, unknown>>;
    expect(attachments).toHaveLength(1);
    expect(attachments[0]!.contentType).toBe('application/vnd.microsoft.card.adaptive');

    const card = attachments[0]!.content as Record<string, unknown>;
    expect(card.type).toBe('AdaptiveCard');
    const cardBody = card.body as Array<Record<string, unknown>>;
    expect(cardBody[0]!.text).toBe('Hello from Teams!');

    expect(result).toEqual({
      id: undefined,
      date: expect.any(String),
    });
  });

  it('should use options.webhookUrl over config.webhookUrl', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '1' });

    await connector.sendMessage({
      content: 'Hello!',
      webhookUrl: 'https://other.logic.azure.com/workflows/xyz',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://other.logic.azure.com/workflows/xyz');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: '1' });

    await connector.sendMessage(
      { content: 'Hello!' },
      {
        _passthrough: {
          body: { summary: 'Alert notification' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).summary).toBe('Alert notification');
  });

  it('should throw ConnectorError when no webhook URL is provided', async () => {
    const noUrlConnector = new MsTeamsChatConnector({});

    try {
      await noUrlConnector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.message).toContain('Missing webhook URL');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 400,
        data: 'InvalidPayload',
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.providerMessage).toBe('InvalidPayload');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
