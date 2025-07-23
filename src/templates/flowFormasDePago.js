import { addKeyword } from "@builderbot/bot";
import { getSocketIO, userState, globalOrderData } from "../utils/state";
import { flowPagoLocal } from "./flowPagoLocal";
import { flowTransferencia } from "./flowTransferencia"; 
import { flowCalificacion } from "./flowCalificacion";

let mesa;

const flowFormasDePago = addKeyword(["🍽️ Conforme"]).addAnswer(
  "💵 *Formas de pago*",
  {
    buttons: [{ body: "💳Transferencia" }, { body: "💵Efectivo" }],
    capture: true,
  },

  async (ctx, { flowDynamic, gotoFlow }) => {
    const userResponse = ctx.body;
    mesa = userState[ctx.from]?.mesa;

    const io = getSocketIO();
    if (io) {
      io.emit("formas_de_pago", {
        mesa,
        items: globalOrderData[ctx.from]?.items,
        total: globalOrderData[ctx.from]?.total,
        telefono: ctx.from,
      });
    }

    if (userResponse === "💳Transferencia") {
      await flowDynamic(
        `💳 *Plataformas de pago disponibles:*\n` +
        `*Nequi:* 3015879572\n` +
        `*Daviplata:* 3136627797\n\n` +
        `✅ Puedes usar cualquiera de estas opciones para realizar tu pago de forma rápida y segura.`
      );
      return gotoFlow(flowCalificacion);
    } else if (userResponse === "💵Efectivo") {
      return gotoFlow(flowPagoLocal);
    } else {
      await flowDynamic("❌ Por favor, elige una opción válida.");
      return gotoFlow(flowFormasDePago);
    }
  }
);

export { flowFormasDePago };
