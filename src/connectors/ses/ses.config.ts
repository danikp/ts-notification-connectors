export interface SesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  from: string;
  senderName: string;
  configurationSetName?: string;
}
