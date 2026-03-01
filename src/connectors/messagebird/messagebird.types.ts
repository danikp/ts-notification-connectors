export interface MessageBirdSendResponse {
  id: string;
  href: string;
  direction: string;
  type: string;
  originator: string;
  body: string;
  recipients: {
    totalCount: number;
    totalSentCount: number;
    items: { recipient: number; status: string }[];
  };
}
