// plugins/socket.io.ts
import { io, type Socket } from 'socket.io-client'

declare module '#app' {
    interface NuxtApp {
        $socket: Socket
        $connectSocket: (tableName: string) => Promise<void>
    }
}

export default defineNuxtPlugin((nuxtApp) => {
    const { public: { kingsApiBase1 } } = useRuntimeConfig();
    let socket: Socket | null = null;

    // Функция для подключения с динамическими параметрами
    const connectSocket = async (tableName: string) => {
        // Закрываем предыдущее соединение если есть
        if (socket) {
            socket.disconnect();
        }

        const userData = await $fetch('/api/auth/me').catch(() => null);
        const token = userData?.token

        console.log("userData", userData);
        
        if (!userData || !userData.id) {
            console.error('Не удалось получить данные пользователя');
            return;
        }

        const socketUrl = `${kingsApiBase1}/socket/tables/${tableName}/${userData.id}?token=${token}`;

        socket = io(socketUrl, {
            autoConnect: true,
            transports: ['websocket'],
            withCredentials: true,
            auth: { token }
        });

        // Обработчики событий
        socket.on('connect', () => {
            console.log('Соединение установлено', socket!.id)
        });

        socket.on('disconnect', (reason) => {
            console.log('Соединение разорвано', reason)
        });

        socket.on('connect_error', (error) => {
            console.log('Ошибка соединения', error)
        });

        socket.onAny((event, ...args) => {
            console.log(`Socket event: ${event}`, args);
        });

        nuxtApp.provide('socket', socket);
    };

    nuxtApp.provide('connectSocket', connectSocket);
    
    // Автоподключение при старте приложения (опционально)
    nuxtApp.hook('app:mounted', async () => {
        await connectSocket('transport-accounting');
    });
})