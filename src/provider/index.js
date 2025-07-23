import { createProvider } from "@builderbot/bot";
import { MetaProvider as Provider } from "@builderbot/provider-meta";
import { config } from "../config/index.js";

console.log("ENV loaded:", {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
});

export const provider = createProvider(Provider, {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
  version: config.version,
});
