export interface LineSendResponse {
  sentMessages: {
    id: string;
    quoteToken?: string;
  }[];
}
