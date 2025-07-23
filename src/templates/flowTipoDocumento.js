import { addKeyword } from "@builderbot/bot";
import { userState } from "../utils/state"; // Importamos el userState compartido
import { flowCerrarCuenta } from "./flowCerrarCuenta";
import { flowOpcionDocumento } from "./flowOpcionDocumento";



export const flowTipoDocumento = addKeyword("menu_principal").addAnswer(
  " *Si necesitas Factura selecciona 👤 Cc o 📋 Nit* \n\n 👤 Cedula Ciudadania \n 📋 Nit \n 🧑‍🤝‍🧑 Consumidor final",
  {
     buttons: [{ body: "👤 Cc" }, { body: "📋 Nit" },{ body: "🧑‍🤝‍🧑C-Final"}],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow }) => {
  
    const mesa = userState[ctx.from]?.mesa;

    if (ctx.body === "👤 Cc") {
      return gotoFlow(flowOpcionDocumento);
    } else if (ctx.body === "📋 Nit") {
      return gotoFlow(flowOpcionDocumento);
    } else  if (ctx.body === "🧑‍🤝‍🧑C-Final") {
      return gotoFlow(flowCerrarCuenta);
    } else {
      await flowDynamic("❌  Por favor, elige una opción valida.");
      return gotoFlow(flowTipoDocumento);
    }
  }
);

export default (flowTipoDocumento);