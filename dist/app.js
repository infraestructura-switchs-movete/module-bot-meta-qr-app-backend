import 'dotenv/config';
import path, { join } from 'path';
import { createProvider, addKeyword, createFlow, createBot, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import * as crypto from 'crypto';
import axios from 'axios';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

const config = {
  // Agregar todas las variables de entorno
  PORT: process.env.PORT || 3008,
  provider: process.env.PROVIDER,
  // Meta
  jwtToken: process.env.JWTTOKEN,
  numberId: process.env.NUMBERID,
  verifyToken: process.env.VERIFYTOKEN,
  version: "v22.0",
  encryptToken: process.env.ENCRYPT_TOKEN,
};

console.log("ENV loaded:", {
  jwtToken: process.env.JWT_TOKEN,
  numberId: process.env.NUMBER_ID,
  verifyToken: process.env.VERIFY_TOKEN,
});

const provider = createProvider(MetaProvider, {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
  version: config.version,
});

let io$1 = null;
const setSocketIO = (serverIO) => {
    io$1 = serverIO;
};
const getSocketIO = () => io$1;
const userState = {};
const globalOrderData = {};

const secretKey = config.encryptToken;
const toBase64URL = (base64) => {
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};
const encryptPhoneNumber = (phoneNumber) => {
    if (!secretKey) {
        throw new Error("encryptToken (secretKey) is undefined. Verifica tu configuración.");
    }
    const iv = crypto.randomBytes(16);
    const key = crypto
        .createHash('sha256')
        .update(secretKey)
        .digest('base64')
        .substring(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(phoneNumber, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const ivBase64URL = toBase64URL(iv.toString('base64'));
    const encryptedBase64URL = toBase64URL(encrypted);
    return `${ivBase64URL}.${encryptedBase64URL}`;
};

const MENU_URL = "https://module-landing-page-qr-app-frontend-t0rn.onrender.com";

const flowVerMenu = addKeyword(["🍽️ Ver Menú"]).addAction(
  async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
    const cryptPhoneNumber = encryptPhoneNumber(ctx.from); 
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

const flowLlamarMesero = addKeyword(["📞 Mesero"])
  .addAction(async (ctx, { flowDynamic }) => {
    let mesa = ctx.mesa;

    // Verifica si mesa está guardada en el estado
    if (!mesa && userState[ctx.from]) {
      mesa = userState[ctx.from].mesa;
      ctx.mesa = mesa;
    }

    if (!mesa) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
      // Llamada al backend externo
      const response = await axios.post(
        `https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/restauranttable/change/status-requesting-service?tableNumber=${mesa}`
      );
      console.log("Respuesta waiter call:", response.data);

      // Emitimos evento vía Socket.IO
      const io = getSocketIO();
      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `✅ *¡Aviso recibido!* Un mesero se dirige a tu mesa (#${mesa})`,
        {
          body: "¿Necesitas algo más?",
          buttons: [{ body: "🍽️ Ver Menú" }, { body: "🚪 Finalizar" }],
          delay: 1000,
        },
      ]);

      userState[ctx.from] = userState[ctx.from] || {};
      userState[ctx.from].estado = "post_llamada_mesero";
    } catch (error) {
      console.error("Error al llamar al mesero:", error);
      await flowDynamic("❌ Error al llamar al mesero. Intenta nuevamente.");
    }
  })

  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
      const respuesta = ctx.body?.trim();

      if (respuesta === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu);
      }
      if (respuesta === "🚪 Finalizar") {
        await flowDynamic("¡Gracias por tu visita! Si necesitas algo más, escribe *hola*.");
        return;
      }

      await flowDynamic("❌ Por favor, selecciona una opción válida.");
    }
  );

const flowOpciones = addKeyword("menu_principal").addAnswer(
  "⬇️ *¿Qué deseas hacer?* ",
  {
    buttons: [{ body: "🍽️ Ver Menú" }, { body: "📞 Mesero" }],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow }) => {
    // Obtenemos la mesa del estado compartido
    userState[ctx.from]?.mesa;

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

const cambiarEstadoMesa = async (tableNumber) => {
    try {
        const response = await axios.post(`https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/restauranttable/change/status-ocuped`, {}, {
            params: { tableNumber },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Mesa ${tableNumber} marcada como ocupada.`);
        return response.data;
    }
    catch (error) {
        console.error(`❌ Error al cambiar el estado de la mesa ${tableNumber}:`, error.message);
        return null;
    }
};
const cambiarEstadoMesaLibre = async (tableNumber) => {
    try {
        const response = await axios.post(`https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/restauranttable/change/status-free`, {}, {
            params: { tableNumber },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Mesa ${tableNumber} marcada como libre.`);
        return response.data;
    }
    catch (error) {
        console.error(`❌ Error al cambiar el estado de la mesa ${tableNumber}:`, error.message);
        return null;
    }
};

const flowMenuInicio = addKeyword("Hola estoy en la mesa")
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

const flowCalificacion = addKeyword("calificacion").addAnswer(
  "⭐ *¿Escoge tu calificación?*",
  {
    buttons: [{ body: "Excelente" }, { body: "Regular" },{ body: "Malo" } ],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow, endFlow}) => {
    const mesa = userState[ctx.from]?.mesa;

    if (!userState[ctx.from]) {
      userState[ctx.from] = {};
    }

    userState[ctx.from]?.calificacion;

    if (ctx.body === "Excelente") {
      userState[ctx.from].calificacion = "Excelente"; // Guardamos la calificación
      await flowDynamic("*¡🌟 ¡Gracias por tu excelente calificación! Vuelve pronto.*");
      await cambiarEstadoMesaLibre(mesa);
      return endFlow();
    } else if (ctx.body === "Regular") {
      userState[ctx.from].calificacion = "Regular"; // Guardamos la calificación
      await flowDynamic("*😐 Gracias por tu calificación. Trabajaremos para mejorar tu próxima experiencia.*");
      await cambiarEstadoMesaLibre(mesa);
      return endFlow();
    } else if (ctx.body === "Malo") {
      userState[ctx.from].calificacion = "Malo"; // Guardamos la calificación
      await flowDynamic("*😢 Lamentamos tu experiencia. Nos comprometemos a mejorar. ¡Esperamos verte pronto!*");
      await cambiarEstadoMesaLibre(mesa);
      return endFlow();
    } else {
      await flowDynamic("❌ Por favor, elige una opción válida.");
      return gotoFlow(flowCalificacion);
    } 
  }
);

let mesa$4;

const flowPagoLocal = addKeyword(["🏠Pago local"]).addAction(
  async (ctx, { flowDynamic, gotoFlow }) => {
    mesa$4 = userState[ctx.from]?.mesa;

    if (!mesa$4) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
      const io = getSocketIO();
      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa$4,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `🏃‍♂️ *Mesero en camino mesa* (#${mesa$4})`,
         {
        body: "⭐ *¿Deseas calificar tu atención?*",
        buttons: [
          { body: "✅ Sí"},
          { body: "🚫 No" },
        ],
        delay: 1000,
      },
      ]);

      userState[ctx.from].estado = "post_llamada_mesero";
    } catch (error) {
      console.error("Error al llamar al mesero:", error);
      await flowDynamic("❌ Error al llamar al mesero. Intenta nuevamente.");
    }
  })
  
  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
      if (ctx.body === "✅ Sí") {
        return gotoFlow(flowCalificacion);
      } else if (ctx.body === "🚫 No") {
        await flowDynamic("*¡👋 Gracias por tu visita vuelve pronto!* ");
        await cambiarEstadoMesaLibre(mesa$4);
        return endFlow();
      } else
      await flowDynamic("❌  Por favor, elige una opción valida.");
      return gotoFlow(flowPagoLocal); // Repite el flujo si no es ninguna de las opciones anteriores
    }
  );

const flowTransferencia = addKeyword(["💳Transferencia"]).addAnswer(
  `💳 *Plataformas de pago disponibles:*
  
  *Nequi:* 315 395 65*3  
  *Bancolombia (Cuenta de Ahorros):* 912 684 0*762  
  
  ✅ Puedes usar cualquiera de estas opciones para realizar tu pago de forma rápida y segura.`, 

  async (ctx, { flowDynamic, gotoFlow }) => {
    return gotoFlow(flowCalificacion);
    }
  
);

let mesa$3;

const flowFormasDePago = addKeyword(["🍽️ Conforme"]).addAnswer(
  "💵 *Formas de pago*",
  {
    buttons: [{ body: "💳Transferencia" }, { body: "💵Efectivo" }],
    capture: true,
  },

  async (ctx, { flowDynamic, gotoFlow }) => {
    const userResponse = ctx.body;
    mesa$3 = userState[ctx.from]?.mesa;

    const io = getSocketIO();
    if (io) {
      io.emit("formas_de_pago", {
        mesa: mesa$3,
        items: globalOrderData[ctx.from]?.items,
        total: globalOrderData[ctx.from]?.total,
        telefono: ctx.from,
      });
    }

    if (userResponse === "💳Transferencia") {
      await flowDynamic(
        `💳 *Plataformas de pago disponibles:*\n` +
        `*Nequi:* 3015879572\n` +
        `*Daviplata:* 3136627797\n\n` +
        `✅ Puedes usar cualquiera de estas opciones para realizar tu pago de forma rápida y segura.`
      );
      return gotoFlow(flowCalificacion);
    } else if (userResponse === "💵Efectivo") {
      return gotoFlow(flowPagoLocal);
    } else {
      await flowDynamic("❌ Por favor, elige una opción válida.");
      return gotoFlow(flowFormasDePago);
    }
  }
);

let mesa$2;

const flowObservacion = addKeyword(["📞 observación"])
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    mesa$2 = userState[ctx.from]?.mesa;

    if (!mesa$2) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
      const io = getSocketIO();
      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa$2,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `✅ *¡Aviso recibido!* Un mesero se dirige a tu mesa (#${mesa$2})`,
        {
          body: "¿Conforme con la cuenta?",
          buttons: [{ body: "📝 Conforme" }],
          delay: 1000,
        },
      ]);

      userState[ctx.from].estado = "post_llamada_mesero";
    } catch (error) {
      console.error("Error al llamar al mesero:", error);
      await flowDynamic("❌ Error al llamar al mesero. Intenta nuevamente.");
    }
  })
  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
      if (ctx.body === "📝 Conforme") {
        return gotoFlow(flowFormasDePago);
      } else {
        await flowDynamic("❌  Por favor, elige una opción valida.");
        return endFlow(flowObservacion);
      }
    }
  );

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

const flowCorreo = addKeyword("DigitarCorreo").addAnswer(
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

const flowNombre = addKeyword("DigitarNombre").addAnswer(
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

const flowOpcionDocumento = addKeyword("DigitarNumero").addAnswer(
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

const flowTipoDocumento = addKeyword("menu_principal").addAnswer(
  " *Si necesitas Factura selecciona 👤 Cc o 📋 Nit* \n\n 👤 Cedula Ciudadania \n 📋 Nit \n 🧑‍🤝‍🧑 Consumidor final",
  {
     buttons: [{ body: "👤 Cc" }, { body: "📋 Nit" },{ body: "🧑‍🤝‍🧑C-Final"}],
    capture: true,
  },
  async (ctx, { flowDynamic, gotoFlow }) => {
  
    userState[ctx.from]?.mesa;

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

let mesa$1;

const flowMeceroCerrar = addKeyword(["📞 Mesero"])
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    mesa$1 = userState[ctx.from]?.mesa;

    if (!mesa$1) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
            const io = getSocketIO();

      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa$1,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `✅ *¡Aviso recibido!* Un mesero se dirige a tu mesa (#${mesa$1})`,
        {
          body: "¿Necesitas algo más?",
          buttons: [{ body: "🍽️ Ver Menú" },{ body: "❌Cerrar Cuenta" }],
          delay: 1000,
        },
      ]);

      userState[ctx.from].estado = "post_llamada_mesero";
    } catch (error) {
      console.error("Error al llamar al mesero:", error);
      await flowDynamic("❌ Error al llamar al mesero. Intenta nuevamente.");
    }
  })
  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
      if (ctx.body === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu);
      } else if (ctx.body === "❌Cerrar Cuenta") {
      return gotoFlow(flowTipoDocumento);
      }else {
        await flowDynamic("❌  Por favor, elige una opción valida.");
        return endFlow(flowMeceroCerrar);
      }
    }
  );

const flowConfirmacionSi = addKeyword(["sí", "si", "SI"])
  .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
    userState[ctx.from]?.mesa;

    // Emitir evento 'nuevo_pedido'
    const io = getSocketIO();
    if (io) {
      io.emit("nuevo_pedido", {
        mesa: userState[ctx.from]?.mesa,
        items: globalOrderData[ctx.from]?.items,
        total: globalOrderData[ctx.from]?.total,
        telefono: ctx.from,
      });

      
    }

    try {
      const orderPayload = {
        restaurantTable: userState[ctx.from]?.mesa,
        phone: ctx.from,
        items: (globalOrderData[ctx.from]?.items || []).map(i => ({
          productId: i.productId || "",
          name: i.name,
          qty: i.qty,
          unitPrice: i.price || i.unitPrice || 0
        })),
        total: globalOrderData[ctx.from]?.total || 0
      };

      console.log("Payload que se enviará:", orderPayload);

      await axios.post("https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/order", orderPayload);
      console.log("✅ Pedido enviado al endpoint externo:", orderPayload);
    } catch (error) {
      console.error("❌ Error al enviar el pedido al endpoint externo:", error.message);
    }

    // Enviar confirmación
    await flowDynamic([
      `✅ *¡Cuenta Abierta!* En la mesa (#${userState[ctx.from]?.mesa})`,
      {
        body: "¿Necesitas algo más?",
        buttons: [
          { body: "🍽️ Ver Menú" },
          { body: "📞 Mesero" },
          { body: "❌Cerrar Cuenta" },
        ],
        delay: 1000,
      },
    ]);

    userState[ctx.from].estado = "post_llamada_mesero";
    userState[ctx.from].pedidoConfirmado = true;
  })

  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
      console.log("Entró al flujo de confirmación", ctx.body);
      
      if (ctx.body === "📞 Mesero") {
        return gotoFlow(flowLlamarMesero);
      } else if (ctx.body === "❌Cerrar Cuenta") {
        return gotoFlow(flowTipoDocumento);
      } else if (ctx.body === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu);
      }

      return gotoFlow(flowConfirmacionSi); // Repite el flujo si no es ninguna de las opciones anteriores
    }
  );

let mesa;

const flowConfirmacionNo = addKeyword(["no", "n", "No"])
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    mesa = userState[ctx.from]?.mesa;
    await flowDynamic([
      {
        body: "*Pedido Cancelado.* \n\n ⬇️¿Qué deseas hacer?",
        buttons: [{ body: "🍽️ Ver Menú" }, { body: "❌ Salir" }],
        delay: 1000,
      },
    ]);
  })
  .addAction(
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
      const io = getSocketIO();
      if (ctx.body === "🍽️ Ver Menú") {
        return gotoFlow(flowVerMenu); // Redirigir al flujo de ver menú
      } else if (ctx.body === "❌ Salir") {
        await flowDynamic("👋 *¡Gracias por tu visita te esperamos pronto!* ");
        if (io && typeof io.emit === "function") {
          io.emit("limpiar_notificaciones", { mesa });
        }
        await cambiarEstadoMesaLibre(mesa);
        return endFlow();
      } else {
        return gotoFlow(flowConfirmacionNo);
      }
    }
  );

var templates = createFlow([
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.VERIFYTOKEN) {
        return res.status(200).send(challenge);
    }
    else {
        return res.sendStatus(403);
    }
});
app.post('/webhook', (req, res) => {
    console.log('📩 Webhook POST recibido:', JSON.stringify(req.body, null, 2));
    return res.sendStatus(200);
});
app.post('/order-complete', async (req, res) => {
    try {
        const { phone, items, total } = req.body;
        const timestamp = new Date();
        const formattedTime = moment(timestamp).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
        const cleanedPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
        const mesa = userState[cleanedPhone]?.mesa || 'desconocida';
        globalOrderData[cleanedPhone] = {
            mesa,
            items,
            total,
            timestamp: formattedTime,
        };
        userState[cleanedPhone] = userState[cleanedPhone] || {};
        userState[cleanedPhone].estado = 'esperando_confirmacion';
        const lista = items.map((i) => `• ${i.qty} × ${i.name} ($${i.price})`).join('\n');
        const resumen = `🍔 *Resumen de tu pedido:*\n${lista}\n\nTotal: $${total}\n\n✅ ¿Confirmas tu pedido?\n(Responde "sí" o "no")`;
        await provider.sendText(`${cleanedPhone}@s.whatsapp.net`, resumen);
        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Error interno');
    }
});
const server = http.createServer(app);
const io = new Server(server);
setSocketIO(io);
io.on('connection', (socket) => {
    console.log('🔌 WebSocket conectado');
});
const main = async () => {
    try {
        console.log('🤖 Iniciando bot...');
        await createBot({
            flow: templates,
            provider,
            database: new MemoryDB(),
            server,
        });
        app.get('/status', (req, res) => {
            res.json({
                success: true,
                bot: 'Builderbot activo',
                express: 'Servidor Express funcionando correctamente ✅',
                timestamp: new Date().toISOString(),
            });
        });
        server.listen(PORT, () => {
            console.log(`🚀 Servidor y bot corriendo en puerto ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Error al iniciar el bot:', error);
    }
};
main();
