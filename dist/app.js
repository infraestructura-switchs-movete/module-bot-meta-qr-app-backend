import { createProvider, addKeyword, createFlow, createBot, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import * as crypto from 'crypto';
import axios from 'axios';

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

// server.js

// Simular __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Variables globales
let userState$1 = {}; // Estado de los usuarios
let globalOrderData = {}; // Datos de los pedidos
let io;

// ──────────── API WEBHOOK EXPRESS ────────────


app.post("/order-complete", async (req, res) => {
  try {
    const { phone, items, total } = req.body;

    const timestamp = new Date('2025-07-01T05:59:55.575Z');
    const formattedTime = moment(timestamp).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    console.log(formattedTime);

    console.log("Datos recibidos:", { phone, items, total, timestamp: formattedTime });
    if (!phone || !Array.isArray(items) || !items.length) {
      return res.status(400).send("Faltan datos");
    }

    const cleanedPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (!cleanedPhone) {
      return res.status(400).send("Número de teléfono inválido");
    }

    const mesa = userState$1[cleanedPhone]?.mesa || "desconocida";
    globalOrderData[cleanedPhone] = {
      mesa,
      items,
      total,
      timestamp: formattedTime,
    };
    userState$1[cleanedPhone] = userState$1[cleanedPhone] || {};
    userState$1[cleanedPhone].estado = "esperando_confirmacion";

    const lista = items.map((i) => {
      const precioUnitario = i.price ? `$${i.price.toLocaleString()}` : "Precio no disponible";
      return `• ${i.qty} × ${i.name} (${precioUnitario})`;
    }).join("\n");

    const resumenPedido = `🍔 *Resumen de tu pedido:*\n${lista}\n\nTotal: $${total.toLocaleString()}\n\n✅ ¿Confirmas tu pedido?\n(Responde "sí" o "no")`;

    // Enviar mensaje de confirmación
    if (!provider) {
      console.error("Error: instancia de proveedor no disponible");
      return res.status(500).send("Error interno");
    }

    await provider.sendText(`${cleanedPhone}@s.whatsapp.net`, resumenPedido);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook order-complete:", error);
    res.status(500).send("Error interno");
  }
});


// Ruta para consultar el estado del pedido
app.get("/order-status", (req, res) => {
  const phone = req.query.phone;
  if (!phone) {
    return res.status(400).json({ error: "Parámetro phone requerido" });
  }
  const order = globalOrderData[phone];
  if (!order) {
    return res
      .status(404)
      .json({ error: "No existe pedido para ese teléfono" });
  }
  return res.json({
    mesa: order.mesa || "no registrada",
    phone,
    items: order.items,
    total: order.total,
    timestamp: order.timestamp,
  });
});

// Ruta para obtener todos los pedidos
app.get("/all-orders", (req, res) => {
  const allOrders = Object.entries(globalOrderData).map(([phone, order]) => ({
    phone,
    mesa: order.mesa,
    items: order.items,
    total: order.total,
    timestamp: order.timestamp,
  }));
  res.json(allOrders);
});

// Añade esta ruta para la página de notificaciones
app.get("/notificaciones", (req, res) => {
  const filePath = path.join(
    __dirname,
    "public/components",
    "NotificacionPanel.html"
  );
  res.sendFile(filePath);
});

// Manejo de errores para Express
app.use((err, req, res, next) => {
  console.error("Error en Express:", err);
  res.status(500).send("Error interno del servidor");
});

// ──────────── INICIAR SERVIDOR ────────────
const server = http.createServer(app);
io = new Server(server);

io.on("connection", (socket) => {
  console.log("💻 Personal conectado al sistema de notificaciones");

  socket.on("disconnect", () => {
    console.log("❌ Personal desconectado del sistema de notificaciones");
  });
});

server.listen(4000, () => {
  console.log("📡 Servidor escuchando en puerto 4008");
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

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

const MENU_URL = "http://localhost:5175";

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
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    let mesa = ctx.mesa;
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
      //console.log("tableId:", mesa);
      //const waiterPayload = {
        //tableId: mesa,
        //status: 1
      //};
      //const response = await axios.post("http://localhost:8080/waitercall", waiterPayload);
      const response = await axios.post(`http://localhost:8080/api/back-whatsapp-qr-app/restauranttable/change/status-requesting-service?tableNumber=${mesa}`);
      console.log("Respuesta waiter call:", response.data);

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
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    let mesa = ctx.mesa;
    if (!mesa && userState[ctx.from]) {
      mesa = userState[ctx.from].mesa;
      ctx.mesa = mesa;
    }
    console.log("Mesa actual ocupada", mesa);

    if (!mesa) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }
    }
  )

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
    // Puedes manejar otras respuestas aquí si lo deseas
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
        const response = await axios.post(`http://localhost:8080/api/back-whatsapp-qr-app/restauranttable/change/status-ocuped`, {}, {
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
        const response = await axios.post(`http://localhost:8080/api/back-whatsapp-qr-app/restauranttable/change/status-free`, {}, {
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

const userState = {};

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

        if (result) {

          io.emit("mesa_ocupada", {
          mesa: mesa,
          telefono: ctx.from,
          estado: result, 
          timestamp: new Date(),
        });

        
          await flowDynamic(`*👋 Bienvenid@ Mesa #${mesa} 🪑*\n
            *El Chuzo de Iván Parrilla*🍔🌭  
            A continuación, encontrarás 
            nuestro menú con opciones 
            para todos los gustos.  
            ¡Haz clic en el botón para 
            ver lo que tenemos preparado 
            para ti! 🍽️`);
          return gotoFlow(flowOpciones);
        }

        

      } else {
        await flowDynamic(
          "❌ Mesa no válida. Por favor, elige un número entre 1 y 50."
        );
        return gotoFlow(flowMenuInicio);
      }
    } else {
      // Si el mensaje no coincide con el formato esperado
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

let mesa$3;

const flowPagoLocal = addKeyword(["🏠Pago local"]).addAction(
  async (ctx, { flowDynamic, gotoFlow }) => {
    mesa$3 = userState[ctx.from]?.mesa;

    if (!mesa$3) {
      await flowDynamic(
        "❌ No se encontró tu número de mesa. Por favor inicia nuevamente."
      );
      return;
    }

    try {
      if (io && typeof io.emit === "function") {
        io.emit("llamada_mesero", {
          mesa: mesa$3,
          telefono: ctx.from,
          timestamp: new Date(),
        });
      }

      await flowDynamic([
        `🏃‍♂️ *Mesero en camino mesa* (#${mesa$3})`,
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
        await cambiarEstadoMesaLibre(mesa$3);
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

const flowFormasDePago = addKeyword(["🍽️ Conforme"]).addAnswer(
  "💵 *Formas de pago*",
  {
    buttons: [{ body: "💳Transferencia" }, { body: "💵Efectivo" }],
    capture: true,
  },

  async (ctx, { flowDynamic, gotoFlow }) => {
    const userResponse = ctx.body;
    userState[ctx.from]?.mesa;

    if (io) {
      io.emit("formas_de_pago", {
        mesa: userState[ctx.from]?.mesa,
        items: globalOrderData[ctx.from]?.items,
        total: globalOrderData[ctx.from]?.total,
        telefono: ctx.from,
      });
    }

    if (userResponse === "💳Transferencia") {
      await flowDynamic( `💳 *Plataformas de pago disponibles:*
       *Nequi:* 3015879572 
       *Daviplata:* 3136627797  
  
      ✅ Puedes usar cualquiera de estas opciones para realizar tu pago de forma rápida y segura.`);
      return gotoFlow(flowCalificacion);
    } else if (userResponse === "💵Efectivo") {
      return gotoFlow(flowPagoLocal);
    } else {
      await flowDynamic("❌ Por favor, elige una opción válida.");
      return gotoFlow(flowFormasDePago); // Regresa al flujo de cerrar cuenta para que elija de nuevo
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

      await axios.post("http://localhost:8080/api/back-whatsapp-qr-app/order", orderPayload);
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

var tempplates = createFlow([
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

const PORT = config.PORT;
const main = async () => {
    try {
        console.log("🤖 Iniciando el bot...");
        const { handleCtx, httpServer } = await createBot({
            flow: tempplates,
            provider: provider,
            database: new MemoryDB(),
        });
        console.log("🚀 Bot iniciado correctamente.");
        httpServer(PORT);
    }
    catch (error) {
        console.error("Error al iniciar el bot:", error);
        process.exit(1);
    }
};
main();
