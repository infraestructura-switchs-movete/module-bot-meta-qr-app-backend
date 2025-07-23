import { addKeyword } from "@builderbot/bot";
import { getSocketIO, userState } from "../utils/state";
import { flowCalificacion } from "./flowCalificacion";
import { cambiarEstadoMesaLibre } from "../Services/Tableservice";

let mesa;

const flowPagoLocal = addKeyword(["🏠Pago local"]).addAction(
  async (ctx, { flowDynamic, gotoFlow }) => {
    mesa = userState[ctx.from]?.mesa;

    if (!mesa) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
      const io = getSocketIO();
      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `🏃‍♂️ *Mesero en camino mesa* (#${mesa})`,
         {
        body: "⭐ *¿Deseas calificar tu atención?*",
        buttons: [
          { body: "✅ Sí"},
          { body: "🚫 No" },
        ],
        delay: 1000,
      },
      ]);

      userState[ctx.from].estado = "post_llamada_mesero";
    } catch (error) {
      console.error("Error al llamar al mesero:", error);
      await flowDynamic("❌ Error al llamar al mesero. Intenta nuevamente.");
    }
  })
  
  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
      if (ctx.body === "✅ Sí") {
        return gotoFlow(flowCalificacion);
      } else if (ctx.body === "🚫 No") {
        await flowDynamic("*¡👋 Gracias por tu visita vuelve pronto!* ");
        await cambiarEstadoMesaLibre(mesa)
        return endFlow();
      } else
      await flowDynamic("❌  Por favor, elige una opción valida.");
      return gotoFlow(flowPagoLocal); // Repite el flujo si no es ninguna de las opciones anteriores
    }
  );

export { flowPagoLocal };
