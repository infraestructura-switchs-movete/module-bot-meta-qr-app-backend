import axios from 'axios';


export const cambiarEstadoMesa = async (tableNumber: number): Promise<any> => {
  try {
    const response = await axios.post(
      `https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/restauranttable/change/status-ocuped`,
      {}, 
      {
        params: { tableNumber },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Mesa ${tableNumber} marcada como ocupada.`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error al cambiar el estado de la mesa ${tableNumber}:`, error.message);
    return null;
  }
};
export const cambiarEstadoMesaLibre = async (tableNumber: number): Promise<any> => {
  try {
    const response = await axios.post(
      `https://arqmv-module-back-whatsapp-qr-app-backend.onrender.com/api/back-whatsapp-qr-app/restauranttable/change/status-free`,
      {}, 
      {
        params: { tableNumber },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Mesa ${tableNumber} marcada como libre.`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error al cambiar el estado de la mesa ${tableNumber}:`, error.message);
    return null;
  }
};