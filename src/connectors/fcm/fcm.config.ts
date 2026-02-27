export interface FcmConfig {
  projectId: string;
  email: string;     // service account client_email
  secretKey: string; // service account private_key (PEM-encoded RSA)
}
