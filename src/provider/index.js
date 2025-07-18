import { createProvider } from "@builderbot/bot";
import { MetaProvider as Provider } from "@builderbot/provider-meta";
import { config } from "../config/index.js";

console.log("ENV loaded:", {
  jwtToken: process.env.JWT_TOKEN,
  numberId: process.env.NUMBER_ID,
  verifyToken: process.env.VERIFY_TOKEN,
});

export const provider = createProvider(Provider, {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
  version: config.version,
});
