export interface InfobipSendResponse {
  bulkId: string;
  messages: {
    to: string;
    status: { groupId: number; groupName: string; id: number; name: string; description: string };
    messageId: string;
  }[];
}
