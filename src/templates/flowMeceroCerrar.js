import { addKeyword } from "@builderbot/bot";
import { getSocketIO, userState } from "../utils/state";
import { flowVerMenu } from "./flowVerMenu";
import {flowTipoDocumento} from "./flowTipoDocumento";

let mesa;

const flowMeceroCerrar = addKeyword(["📞 Mesero"])
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
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
        `✅ *¡Aviso recibido!* Un mesero se dirige a tu mesa (#${mesa})`,
        {
          body: "¿Necesitas algo más?",
          buttons: [{ body: "🍽️ Ver Menú" },{ body: "❌Cerrar Cuenta" }],
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
      if (ctx.body === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu);
      } else if (ctx.body === "❌Cerrar Cuenta") {
      return gotoFlow(flowTipoDocumento);
      }else {
        await flowDynamic("❌  Por favor, elige una opción valida.");
        return endFlow(flowMeceroCerrar);
      }
    }
  );

export { flowMeceroCerrar };
