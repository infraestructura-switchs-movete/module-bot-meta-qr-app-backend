import { addKeyword } from "@builderbot/bot";
import { userState } from "./flowMenuInicio"; // Importamos el userState compartido
import { flowCorreo } from "./flowCorreo";

export const flowNombre = addKeyword("DigitarNombre").addAnswer(
  " ⬇️ *Digita tu nombre*",
  { capture: true },
  async (ctx, { flowDynamic, gotoFlow }) => {
      
      const nombreIngresado = ctx.body;
      console.log("Número ingresado:", nombreIngresado);
      
      // Guardamos el número en el estado del usuario
      userState[ctx.from] = userState[ctx.from] || {};
      userState[ctx.from].numero = nombreIngresado;

      return gotoFlow(flowCorreo);
    
  }
);

export default (flowNombre);