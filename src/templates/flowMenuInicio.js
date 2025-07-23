import { addKeyword } from "@builderbot/bot";
import { userState, getSocketIO } from "../utils/state";
import { flowOpciones } from "./flowOpciones";
import { cambiarEstadoMesa } from "../Services/Tableservice";

export const flowMenuInicio = addKeyword("Hola estoy en la mesa")
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    const mesaRegex = /^Hola estoy en la mesa\s+(\d+)$/i;
    const match = ctx.body.match(mesaRegex);

    if (match) {
      const mesa = parseInt(match[1], 10);

      if (mesa >= 1 && mesa <= 50) {
        const result = await cambiarEstadoMesa(mesa);

        ctx.mesa = mesa;
        if (!userState[ctx.from]) userState[ctx.from] = {};
        userState[ctx.from].mesa = mesa;

        const io = getSocketIO();
        if (io && typeof io.emit === "function") {
          io.emit("mesa_ocupada", {
            mesa: mesa,
            telefono: ctx.from,
            estado: result,
            timestamp: new Date(),
          });
        }

        await flowDynamic(`*👋 Bienvenid@ Mesa #${mesa} 🪑*\n
          *El Chuzo de Iván Parrilla*🍔🌭  
          A continuación, encontrarás 
          nuestro menú con opciones 
          para todos los gustos.  
          ¡Haz clic en el botón para 
          ver lo que tenemos preparado 
          para ti! 🍽️`);
        return gotoFlow(flowOpciones);
      } else {
        await flowDynamic(
          "❌ Mesa no válida. Por favor, elige un número entre 1 y 50."
        );
        return gotoFlow(flowMenuInicio);
      }
    } else {
      await flowDynamic(
        "❌ Formato incorrecto. Por favor, envía un mensaje como: 'Hola estoy en la mesa X' (donde X es un número entre 1 y 50)."
      );
      return gotoFlow(flowMenuInicio);
    }
  });
