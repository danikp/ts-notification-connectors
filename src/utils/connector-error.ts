export class ConnectorError extends Error {
  public readonly statusCode: number;
  public readonly providerCode?: string;
  public readonly providerMessage?: string;

  constructor(options: {
    message: string;
    statusCode: number;
    providerCode?: string;
    providerMessage?: string;
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'ConnectorError';
    this.statusCode = options.statusCode;
    this.providerCode = options.providerCode;
    this.providerMessage = options.providerMessage;
  }
}
