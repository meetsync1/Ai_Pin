export const ENV = {
  sarvamApiKey: process.env.EXPO_PUBLIC_SARVAM_API_KEY ?? "",
  sarvamBaseUrl: process.env.EXPO_PUBLIC_SARVAM_BASE_URL ?? "",
  sarvamWebhookSecret: process.env.EXPO_PUBLIC_SARVAM_WEBHOOK_SECRET ?? "",
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? "",
  appSecretKey: process.env.EXPO_PUBLIC_APP_SECRET_KEY ?? "",
  openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
  openAiBaseUrl:
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? "https://api.openai.com/v1",
};

export function requireEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is not set. Add it to your .env file.`);
  }
  return value;
}
