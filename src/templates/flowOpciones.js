import { addKeyword } from "@builderbot/bot";
import { io } from "../server";
import { userState } from "./flowMenuInicio"; // Importamos el userState compartido
import { flowMenuInicio } from "./flowMenuInicio";
import { flowLlamarMesero } from "./flowLlamarMesero";
import { flowVerMenu } from "./flowVerMenu";

const MENU_URL = "https://digitaltoolscol.wixsite.com/my-site-1/men%C3%BA";

export const flowOpciones = addKeyword("menu_principal").addAnswer(
  "⬇️ *¿Qué deseas hacer?* ",
  {
    buttons: [{ body: "🍽️ Ver Menú" }, { body: "📞 Mesero" }],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow }) => {
    // Obtenemos la mesa del estado compartido
    const mesa = userState[ctx.from]?.mesa;

    if (ctx.body === "🍽️ Ver Menú") {
      return gotoFlow(flowVerMenu);
    } else if (ctx.body === "📞 Mesero") {
      return gotoFlow(flowLlamarMesero);
    } else {
      await flowDynamic("❌  Por favor, elige una opción valida.");
      return gotoFlow(flowOpciones);
    }
  }
);
