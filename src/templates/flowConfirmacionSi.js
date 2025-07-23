import { addKeyword } from "@builderbot/bot";
import { userState } from "../utils/state";
import { getSocketIO, globalOrderData,  } from "../utils/state";
import { flowMeceroCerrar } from "./flowMeceroCerrar";
import { flowVerMenu } from "./flowVerMenu";
import {flowTipoDocumento} from "./flowTipoDocumento";
import axios from "axios";
import { flowLlamarMesero } from "./flowLlamarMesero";

let mesa;

const flowConfirmacionSi = addKeyword(["sí", "si", "SI"])
  .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
    mesa = userState[ctx.from]?.mesa;

    // Emitir evento 'nuevo_pedido'
    const io = getSocketIO();
    if (io) {
      io.emit("nuevo_pedido", {
        mesa: userState[ctx.from]?.mesa,
        items: globalOrderData[ctx.from]?.items,
        total: globalOrderData[ctx.from]?.total,
        telefono: ctx.from,
      });

      
    }

    try {
      const orderPayload = {
        restaurantTable: userState[ctx.from]?.mesa,
        phone: ctx.from,
        items: (globalOrderData[ctx.from]?.items || []).map(i => ({
          productId: i.productId || "",
          name: i.name,
          qty: i.qty,
          unitPrice: i.price || i.unitPrice || 0
        })),
        total: globalOrderData[ctx.from]?.total || 0
      };

      console.log("Payload que se enviará:", orderPayload);

      await axios.post("https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/order", orderPayload);
      console.log("✅ Pedido enviado al endpoint externo:", orderPayload);
    } catch (error) {
      console.error("❌ Error al enviar el pedido al endpoint externo:", error.message);
    }

    // Enviar confirmación
    await flowDynamic([
      `✅ *¡Cuenta Abierta!* En la mesa (#${userState[ctx.from]?.mesa})`,
      {
        body: "¿Necesitas algo más?",
        buttons: [
          { body: "🍽️ Ver Menú" },
          { body: "📞 Mesero" },
          { body: "❌Cerrar Cuenta" },
        ],
        delay: 1000,
      },
    ]);

    userState[ctx.from].estado = "post_llamada_mesero";
    userState[ctx.from].pedidoConfirmado = true;
  })

  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
      console.log("Entró al flujo de confirmación", ctx.body);
      
      if (ctx.body === "📞 Mesero") {
        return gotoFlow(flowLlamarMesero);
      } else if (ctx.body === "❌Cerrar Cuenta") {
        return gotoFlow(flowTipoDocumento);
      } else if (ctx.body === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu);
      }

      return gotoFlow(flowConfirmacionSi); // Repite el flujo si no es ninguna de las opciones anteriores
    }
  );

export { flowConfirmacionSi };
