import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/token';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socketInstance = null;

// Singleton socket connection
const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

/**
 * useSocket — WebSocket ইভেন্ট শোনার জন্য custom hook
 * 
 * @param {string} event - Socket event name (যেমন: 'new_order', 'order_status_update')
 * @param {function} callback - ইভেন্ট পেলে কী করতে হবে
 */
export const useSocket = (event, callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const socket = getSocket();
    const handler = (data) => callbackRef.current(data);
    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [event]);
};

export default getSocket;
