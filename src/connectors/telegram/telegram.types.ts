export interface TelegramResponse {
  ok: boolean;
  result?: { message_id: number };
  error_code?: number;
  description?: string;
}
