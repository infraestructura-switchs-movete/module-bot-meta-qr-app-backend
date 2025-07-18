import { addKeyword } from "@builderbot/bot";
import { io } from "../server";
import { userState } from "./flowMenuInicio";
import { flowVerMenu } from "./flowVerMenu";
import axios from "axios";



const flowLlamarMesero = addKeyword(["📞 Mesero"])
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    let mesa = ctx.mesa;
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
      //console.log("tableId:", mesa);
      //const waiterPayload = {
        //tableId: mesa,
        //status: 1
      //};
      //const response = await axios.post("http://localhost:8080/waitercall", waiterPayload);
      const response = await axios.post(`http://localhost:8080/api/back-whatsapp-qr-app/restauranttable/change/status-requesting-service?tableNumber=${mesa}`);
      console.log("Respuesta waiter call:", response.data);

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
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    let mesa = ctx.mesa;
    if (!mesa && userState[ctx.from]) {
      mesa = userState[ctx.from].mesa;
      ctx.mesa = mesa;
    }
    console.log("Mesa actual ocupada", mesa);

    if (!mesa) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }
    }
  )

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
    // Puedes manejar otras respuestas aquí si lo deseas
  }
);

export { flowLlamarMesero };
