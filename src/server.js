// server.js
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIO } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { provider } from "./provider/index.js";
import moment from 'moment-timezone';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


let userState = {}; 
let globalOrderData = {}; 
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

    const mesa = userState[cleanedPhone]?.mesa || "desconocida";
    globalOrderData[cleanedPhone] = {
      mesa,
      items,
      total,
      timestamp: formattedTime,
    };
    userState[cleanedPhone] = userState[cleanedPhone] || {};
    userState[cleanedPhone].estado = "esperando_confirmacion";

    const lista = items.map((i) => {
      const precioUnitario = i.price ? `$${i.price.toLocaleString()}` : "Precio no disponible";
      return `• ${i.qty} × ${i.name} (${precioUnitario})`;
    }).join("\n");

    const resumenPedido = `🍔 *Resumen de tu pedido:*\n${lista}\n\nTotal: $${total.toLocaleString()}\n\n✅ ¿Confirmas tu pedido?\n(Responde "sí" o "no")`;


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


app.get("/notificaciones", (req, res) => {
  const filePath = path.join(
    __dirname,
    "public/components",
    "NotificacionPanel.html"
  );
  res.sendFile(filePath);
});


app.use((err, req, res, next) => {
  console.error("Error en Express:", err);
  res.status(500).send("Error interno del servidor");
});

// ──────────── INICIAR SERVIDOR ────────────
const server = http.createServer(app);
io = new SocketIO(server);

io.on("connection", (socket) => {
  console.log("💻 Personal conectado al sistema de notificaciones");

  socket.on("disconnect", () => {
    console.log("❌ Personal desconectado del sistema de notificaciones");
  });
});

server.listen(4000, () => {
  console.log("📡 Servidor escuchando en puerto 4000");
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export { io, server, userState, globalOrderData };
