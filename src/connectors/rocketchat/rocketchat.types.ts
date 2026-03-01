export interface RocketChatSendResponse {
  message: {
    _id: string;
    rid: string;
    msg: string;
    ts: string;
  };
  success: boolean;
}
