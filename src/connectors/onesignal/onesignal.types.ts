export interface OneSignalSendResponse {
  id: string;
  external_id: string | null;
  errors?: {
    invalid_aliases?: Record<string, unknown>;
    invalid_player_ids?: string[];
  } | string[];
}
