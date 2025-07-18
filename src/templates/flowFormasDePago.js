import { addKeyword } from "@builderbot/bot";
import { io } from "../server";
import { userState } from "./flowMenuInicio";
import { flowPagoLocal } from "./flowPagoLocal";
import { globalOrderData } from "../server";
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

    if (io) {
      io.emit("formas_de_pago", {
        mesa: userState[ctx.from]?.mesa,
        items: globalOrderData[ctx.from]?.items,
        total: globalOrderData[ctx.from]?.total,
        telefono: ctx.from,
      });
    }

    if (userResponse === "💳Transferencia") {
      await flowDynamic( `💳 *Plataformas de pago disponibles:*
       *Nequi:* 3015879572 
       *Daviplata:* 3136627797  
  
      ✅ Puedes usar cualquiera de estas opciones para realizar tu pago de forma rápida y segura.`);
      return gotoFlow(flowCalificacion);
    } else if (userResponse === "💵Efectivo") {
      return gotoFlow(flowPagoLocal);
    } else {
      await flowDynamic("❌ Por favor, elige una opción válida.");
      return gotoFlow(flowFormasDePago); // Regresa al flujo de cerrar cuenta para que elija de nuevo
    }
  }
);

export { flowFormasDePago };
