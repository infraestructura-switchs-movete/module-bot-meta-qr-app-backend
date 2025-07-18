import { addKeyword } from "@builderbot/bot";
import { flowFormasDePago } from "./flowFormasDePago";
import { flowCalificacion } from "./flowCalificacion";

const flowTransferencia = addKeyword(["💳Transferencia"]).addAnswer(
  `💳 *Plataformas de pago disponibles:*
  
  *Nequi:* 315 395 65*3  
  *Bancolombia (Cuenta de Ahorros):* 912 684 0*762  
  
  ✅ Puedes usar cualquiera de estas opciones para realizar tu pago de forma rápida y segura.`, 

  async (ctx, { flowDynamic, gotoFlow }) => {
    return gotoFlow(flowCalificacion);
    }
  
);

export { flowTransferencia };
