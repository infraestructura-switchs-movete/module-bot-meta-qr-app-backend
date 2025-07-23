import { addKeyword } from "@builderbot/bot";
import { flowVerMenu } from "./flowVerMenu";
import { userState } from "../utils/state";
import { getSocketIO, globalOrderData,  } from "../utils/state";
import { cambiarEstadoMesaLibre } from "../Services/Tableservice";

let mesa;

const flowConfirmacionNo = addKeyword(["no", "n", "No"])
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    mesa = userState[ctx.from]?.mesa;
    await flowDynamic([
      {
        body: "*Pedido Cancelado.* \n\n ⬇️¿Qué deseas hacer?",
        buttons: [{ body: "🍽️ Ver Menú" }, { body: "❌ Salir" }],
        delay: 1000,
      },
    ]);
  })
  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
      const io = getSocketIO();
      if (ctx.body === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu); // Redirigir al flujo de ver menú
      } else if (ctx.body === "❌ Salir") {
        await flowDynamic("👋 *¡Gracias por tu visita te esperamos pronto!* ");
        if (io && typeof io.emit === "function") {
          io.emit("limpiar_notificaciones", { mesa });
        }
        await cambiarEstadoMesaLibre(mesa)
        return endFlow();
      } else {
        return gotoFlow(flowConfirmacionNo);
      }
    }
  );

export { flowConfirmacionNo };
