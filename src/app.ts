// app.ts
import 'dotenv/config';
import { join } from 'path';
import { createBot } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { provider } from './provider/index.js';
import { config } from './config/index.js';
import templates from './templates/index.js';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIO } from 'socket.io';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import path from 'path';
import { setSocketIO, userState, globalOrderData } from './utils/state';



// __dirname emulación
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Rutas necesarias
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFYTOKEN) {
    return res.status(200).send(challenge);
  } else {
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
    console.log("✅ POST recibido en /order-complete:", req.body);

    const timestamp = new Date();
    const formattedTime = moment(timestamp).tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    const cleanedPhone = phone.replace(/\D/g, '').replace(/^0+/, '');

    const mesa = userState[cleanedPhone]?.mesa || 'desconocida';
    console.log("ℹ️ Mesa asociada:", mesa);

    globalOrderData[cleanedPhone] = { mesa, items, total, timestamp: formattedTime };
    userState[cleanedPhone] = userState[cleanedPhone] || {};
    userState[cleanedPhone].estado = 'esperando_confirmacion';

    const lista = items.map((i) => `• ${i.qty} × ${i.name} ($${i.price})`).join('\n');
    const resumen = `🍔 *Resumen de tu pedido:*\n${lista}\n\nTotal: $${total}\n\n✅ ¿Confirmas tu pedido?\n(Responde "sí" o "no")`;

    await Promise.race([
      provider.sendText(`${cleanedPhone}@s.whatsapp.net`, resumen),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout al enviar mensaje')), 7000))
    ]);

    res.status(200).send({ success: true });
  } catch (err) {
    console.error("❌ Error en /order-complete:", err);
    res.status(500).send({ error: "Error interno", detail: err.message });
  }
});

// Crea el servidor HTTP
const server = http.createServer(app);
const io = new SocketIO(server);

setSocketIO(io); 

io.on('connection', (socket) => {
  console.log('🔌 WebSocket conectado');
});

// Crea el bot y lo monta sobre el mismo servidor
const main = async () => {
  try {
    console.log('🤖 Iniciando bot...');
    await createBot({
      flow: templates,
      provider,
      database: new Database(),
      server, // reusar el servidor que creaste arriba
    }as any);

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
  } catch (error) {
    console.error('❌ Error al iniciar el bot:', error);
  }
};

main();
