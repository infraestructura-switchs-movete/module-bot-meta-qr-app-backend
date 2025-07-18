import { addKeyword } from "@builderbot/bot";
import { userState } from "./flowMenuInicio";
import {encryptPhoneNumber} from "../utils/encypt"

const MENU_URL = "http://localhost:5174";

export const flowVerMenu = addKeyword(["🍽️ Ver Menú"]).addAction(
  async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
    const cryptPhoneNumber = encryptPhoneNumber(ctx.from) 
    const linkMenu = `${MENU_URL}?token=${cryptPhoneNumber}`;
    // const linkMenu = `${MENU_URL}?phone=${ctx.from}`;

    // Formatear el enlace usando Markdown
    const message = `🍽️ *Menú disponible:* \n${linkMenu}\n\n` +
  "Cuando termines de elegir, presiona *Enviar Pedido*";

      await flowDynamic(message);

    if (!userState[ctx.from]) {
      userState[ctx.from] = {};
    }
    userState[ctx.from].estado = "viendo_menu";
  }
);