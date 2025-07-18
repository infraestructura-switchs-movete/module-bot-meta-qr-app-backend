import { addKeyword } from "@builderbot/bot";
import { userState } from "./flowMenuInicio"; // Importamos el userState compartido
import { flowCerrarCuenta } from "./flowCerrarCuenta";

export const flowCorreo = addKeyword("DigitarCorreo").addAnswer(
  " ⬇️ *Digita tu Correo*",
  { capture: true },
  async (ctx, { flowDynamic, gotoFlow }) => {
      
      const correoIngresado = ctx.body;
      console.log("Correo ingresado:", correoIngresado);
      
      // Guardamos el número en el estado del usuario
      userState[ctx.from] = userState[ctx.from] || {};
      userState[ctx.from].numero = correoIngresado;

      return gotoFlow(flowCerrarCuenta);
    
  }
);

export default (flowCorreo);