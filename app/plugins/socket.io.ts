// plugins/ws.client.ts
export default defineNuxtPlugin(async (nuxtApp) => {
  const { public: { kingsApiBase1 } } = useRuntimeConfig();

  // узнаём пользователя/токен
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
  const me: any = await $fetch('/api/auth/me', { headers }).catch(() => null);

  const table  = 'transportAccounting';
  const userId = me?.id
  const token  = me?.token

  // финальный raw WS URL
  const url = `wss:/kings-logix.ru/socket/tables/${table}/${userId}?token=${encodeURIComponent(token)}`;

  // отладка
  console.log('[raw-ws] url:', url);
  console.log('[raw-ws] userId:', userId);
  console.log('[raw-ws] token:', token ? '(present)' : '(empty)');

  let ws: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let attempts = 0;

  const connect = () => {
    // безопасность: не создаём второй сокет поверх
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        attempts = 0;
        console.log('[raw-ws] ✅ open');
      };

      ws.onmessage = (ev) => {
        // если payload — JSON, можно парсить:
        try {
          const msg = JSON.parse(ev.data as string);
          console.log('[raw-ws] message(json):', msg);
        } catch {
          console.log('[raw-ws] message(text):', ev.data);
        }
      };

      ws.onerror = (ev) => {
        // браузер маскирует детали — но сам факт ошибки виден
        console.error('[raw-ws] ❌ error event:', ev);
      };

      ws.onclose = (e) => {
        console.warn('[raw-ws] ⚠️ close:', { code: e.code, reason: e.reason, wasClean: e.wasClean });
        // автопереподключение (не делаем при штатном закрытии 1000)
        if (e.code !== 1000) {
          const delay = Math.min(30000, 1000 * Math.pow(2, attempts++)); // 1s,2s,4s,... cap 30s
          reconnectTimer = window.setTimeout(connect, delay) as unknown as number;
          console.log('[raw-ws] reconnect in', delay, 'ms');
        }
      };
    } catch (err) {
      console.error('[raw-ws] ❌ create failed:', err);
    }
  };

  // старт
  connect();

  // удобные хелперы
  const sendJSON = (payload: any) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[raw-ws] sendJSON: socket not open');
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const disconnect = () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'client closing'); // штатно
    }
  };

  // прокидываем в Nuxt
  nuxtApp.provide('ws', ws);
  nuxtApp.provide('wsSend', sendJSON);
  nuxtApp.provide('wsReconnect', () => { if (reconnectTimer) clearTimeout(reconnectTimer); connect(); });
  nuxtApp.provide('wsDisconnect', disconnect);
});
