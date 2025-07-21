import "dotenv/config";
import { addKeyword, EVENTS } from "@builderbot/bot";

export const config = {
  // Agregar todas las variables de entorno
  PORT: process.env.PORT || 3008,
  provider: process.env.PROVIDER,
  // Meta
  jwtToken: process.env.JWTTOKEN,
  numberId: process.env.NUMBERID,
  verifyToken: process.env.VERIFYTOKEN,
  version: "v22.0",
  webhookUrl: "https://module-bot-meta-qr-app-backend.onrender.com",
  encryptToken: process.env.ENCRYPT_TOKEN,
};
