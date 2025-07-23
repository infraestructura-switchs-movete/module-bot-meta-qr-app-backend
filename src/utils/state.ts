import { Server as SocketIO } from "socket.io";

let io: SocketIO | null = null;
export const setSocketIO = (serverIO: SocketIO) => {
  io = serverIO;
};
export const getSocketIO = () => io;

export const userState: Record<string, { mesa?: number; estado?: string }> = {};
export const globalOrderData: Record<
  string,
  { mesa: number | string; items: any[]; total: number; timestamp: string }
> = {};