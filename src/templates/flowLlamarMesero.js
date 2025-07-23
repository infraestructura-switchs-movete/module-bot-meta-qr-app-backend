import { addKeyword } from "@builderbot/bot";
import { getSocketIO, userState } from "../utils/state";
import { flowVerMenu } from "./flowVerMenu";
import axios from "axios";

const flowLlamarMesero = addKeyword(["📞 Mesero"])
  .addAction(async (ctx, { flowDynamic }) => {
    let mesa = ctx.mesa;

    // Verifica si mesa está guardada en el estado
    if (!mesa && userState[ctx.from]) {
      mesa = userState[ctx.from].mesa;
      ctx.mesa = mesa;
    }

    if (!mesa) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
      // Llamada al backend externo
      const response = await axios.post(
        `https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/restauranttable/change/status-requesting-service?tableNumber=${mesa}`
      );
      console.log("Respuesta waiter call:", response.data);

      // Emitimos evento vía Socket.IO
      const io = getSocketIO();
      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `✅ *¡Aviso recibido!* Un mesero se dirige a tu mesa (#${mesa})`,
        {
          body: "¿Necesitas algo más?",
          buttons: [{ body: "🍽️ Ver Menú" }, { body: "🚪 Finalizar" }],
          delay: 1000,
        },
      ]);

      userState[ctx.from] = userState[ctx.from] || {};
      userState[ctx.from].estado = "post_llamada_mesero";
    } catch (error) {
      console.error("Error al llamar al mesero:", error);
      await flowDynamic("❌ Error al llamar al mesero. Intenta nuevamente.");
    }
  })

  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
      const respuesta = ctx.body?.trim();

      if (respuesta === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu);
      }
      if (respuesta === "🚪 Finalizar") {
        await flowDynamic("¡Gracias por tu visita! Si necesitas algo más, escribe *hola*.");
        return;
      }

      await flowDynamic("❌ Por favor, selecciona una opción válida.");
    }
  );

export { flowLlamarMesero };
