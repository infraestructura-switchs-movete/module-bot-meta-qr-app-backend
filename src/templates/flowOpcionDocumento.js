import { addKeyword } from "@builderbot/bot";
import { userState } from "../utils/state";// Importamos el userState compartido
import { flowNombre } from "./flowNombre"; 

export const flowOpcionDocumento = addKeyword("DigitarNumero").addAnswer(
  " ⬇️ *Digita el numero*",
  { capture: true },
  async (ctx, { flowDynamic, gotoFlow }) => {
      // Imprime el número ingresado en la consola
      const numeroIngresado = ctx.body;
      console.log("Número ingresado:", numeroIngresado);
      
      // Guardamos el número en el estado del usuario
      userState[ctx.from] = userState[ctx.from] || {};
      userState[ctx.from].numero = numeroIngresado;

      return gotoFlow(flowNombre);
    
  }
);

export default (flowOpcionDocumento);