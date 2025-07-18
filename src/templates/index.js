import { createFlow } from "@builderbot/bot";
import { flowMenuInicio } from "./flowMenuInicio";
import { flowVerMenu } from "./flowVerMenu";
import { flowLlamarMesero } from "./flowLlamarMesero";
import { flowOpciones } from "./flowOpciones";
import { flowConfirmacionSi } from "./flowConfirmacionSi";
import { flowConfirmacionNo } from "./flowConfirmacionNo";
import { flowCerrarCuenta } from "./flowCerrarCuenta";
import { flowMeceroCerrar } from "./flowMeceroCerrar";
import { flowFormasDePago } from "./flowFormasDePago";
import { flowObservacion } from "./flowObservacion";
import { flowPagoLocal } from "./flowPagoLocal";
import { flowCalificacion } from "./flowCalificacion";
import { flowTipoDocumento } from "./flowTipoDocumento";
import { flowOpcionDocumento } from "./flowOpcionDocumento";
import { flowNombre } from "./flowNombre";
import { flowCorreo } from "./flowCorreo";
import { flowTransferencia } from "./flowTransferencia";


export default createFlow([
  flowMenuInicio,
  flowVerMenu,
  flowLlamarMesero,
  flowOpciones,
  flowConfirmacionSi,
  flowConfirmacionNo,
  flowCerrarCuenta,
  flowMeceroCerrar,
  flowFormasDePago,
  flowObservacion,
  flowPagoLocal,
  flowCalificacion,
  flowTipoDocumento,
  flowOpcionDocumento,
  flowNombre,
  flowCorreo,
  flowTransferencia,
]);
