import { addKeyword } from "@builderbot/bot";
import { userState } from "./flowMenuInicio"; // Importamos el userState compartido
import { cambiarEstadoMesaLibre } from "../Services/Tableservice";


const flowCalificacion = addKeyword("calificacion").addAnswer(
  "⭐ *¿Escoge tu calificación?*",
  {
    buttons: [{ body: "Excelente" }, { body: "Regular" },{ body: "Malo" } ],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow, endFlow}) => {
    const mesa = userState[ctx.from]?.mesa;

    if (!userState[ctx.from]) {
      userState[ctx.from] = {};
    }

    const calificacion = userState[ctx.from]?.calificacion;

    if (ctx.body === "Excelente") {
      userState[ctx.from].calificacion = "Excelente"; // Guardamos la calificación
      await flowDynamic("*¡🌟 ¡Gracias por tu excelente calificación! Vuelve pronto.*");
      await cambiarEstadoMesaLibre(mesa)
      return endFlow();
    } else if (ctx.body === "Regular") {
      userState[ctx.from].calificacion = "Regular"; // Guardamos la calificación
      await flowDynamic("*😐 Gracias por tu calificación. Trabajaremos para mejorar tu próxima experiencia.*");
      await cambiarEstadoMesaLibre(mesa)
      return endFlow();
    } else if (ctx.body === "Malo") {
      userState[ctx.from].calificacion = "Malo"; // Guardamos la calificación
      await flowDynamic("*😢 Lamentamos tu experiencia. Nos comprometemos a mejorar. ¡Esperamos verte pronto!*");
      await cambiarEstadoMesaLibre(mesa)
      return endFlow();
    } else {
      await flowDynamic("❌ Por favor, elige una opción válida.");
      return gotoFlow(flowCalificacion);
    } 
  }
);

export { flowCalificacion };