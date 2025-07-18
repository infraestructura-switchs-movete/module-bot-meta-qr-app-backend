// app.js
import { join } from "path";
import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider/index.js";
import { config } from "./config/index.js";
import tempplates from "./templates/index.js";


const PORT = config.PORT;

const main = async () => {
  try {
    console.log("🤖 Iniciando el bot...");
    const { handleCtx, httpServer } = await createBot({
      flow: tempplates,
      provider: provider,
      database: new Database(),
    });

    console.log("🚀 Bot iniciado correctamente.");

    // Iniciar el servidor HTTP
    httpServer(PORT);
  } catch (error) {
    console.error("Error al iniciar el bot:", error);
    process.exit(1);
  }
};

main();