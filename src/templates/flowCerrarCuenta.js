import { addKeyword } from "@builderbot/bot";
import { flowFormasDePago } from "./flowFormasDePago";
import { flowObservacion } from "./flowObservacion";

const flowCerrarCuenta = addKeyword(["❌Cerrar Cuenta"]).addAnswer(
  "⬇️ *Seleccione una opción:*\n\n• 📝 Conforme con la cuenta\n• 📞 Hacer alguna observación",
  {
    buttons: [{ body: "📝 Conforme" }, { body: "📞 observación" }],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow }) => {
    if (ctx.body === "📝 Conforme") {
      return gotoFlow(flowFormasDePago);
    } else if (ctx.body === "📞 observación") {
      return gotoFlow(flowObservacion);
    } else {
      await flowDynamic("❌ Por favor, elige una opción valida.");
      return gotoFlow(flowCerrarCuenta);
    }
  }
);

export { flowCerrarCuenta };
