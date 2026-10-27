'use strict';

const elTime = document.getElementById('time');
const elDate = document.getElementById('date');
const elStatus = document.getElementById('status');

const WS_URL = 'wss://public-api.siyukatu.com/time/socket?interval=1000';
const HTTP_URL = 'https://public-api.siyukatu.com/time.json';

const PING_INTERVAL = 5000;
const FALLBACK_INTERVAL = 5000;
const REQUEST_TIMEOUT = 5000;
const RECONNECT_MAX = 30000;
const STALE_TIMEOUT = 15000;

const RECONNECT_MIN = 1000;

let serverOffset = 0;
let synced = false;

let ws = null;
let socketCreatedAt = 0;
let reconnectDelay = RECONNECT_MIN;
let reconnectTimer = null;
let pingTimer = null;
let pingSentAt = 0;
let lastRtt = 0;
let lastMessageAt = 0;
let fallbackTimer = null;
let fallbackBusy = false;

function localNow() {
    return performance.timeOrigin + performance.now();
}

function setStatus(state) {
    if (elStatus.dataset.state === state) {
        return;
    }

    const labels = {
        connecting: '接続中',
        online: '接続済み',
        fallback: 'HTTPで同期中',
        offline: '未接続'
    };

    elStatus.dataset.state = state;
    elStatus.title = labels[state] || '';
    elStatus.setAttribute('aria-label', labels[state] || '');
}

function updateOffset(serverTime, sampledAt, rtt) {
    if (!Number.isFinite(serverTime)) {
        return;
    }

    const measured = serverTime + rtt / 2 - sampledAt;

    if (!synced) {
        serverOffset = measured;
        synced = true;
        return;
    }

    const diff = measured - serverOffset;

    if (Math.abs(diff) > 1000) {
        serverOffset = measured;
    } else {
        serverOffset += diff * 0.25;
    }
}

function sendPing() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }

    const now = Date.now();
    pingSentAt = localNow();

    try {
        ws.send(JSON.stringify({
            type: 'ping',
            id: now,
            time: now
        }));
    } catch {
    }
}

function startPing() {
    stopPing();
    pingTimer = setInterval(sendPing, PING_INTERVAL);
}

function stopPing() {
    if (pingTimer !== null) {
        clearInterval(pingTimer);
        pingTimer = null;
    }
}

function handleMessage(event) {
    const receivedAt = localNow();
    lastMessageAt = receivedAt;
    setStatus('online');

    let data;

    try {
        data = JSON.parse(event.data);
    } catch {
        return;
    }

    if (!data || typeof data.time !== 'number' || !Number.isFinite(data.time)) {
        return;
    }

    if (data.type === 'pong') {
        lastRtt = Math.max(0, receivedAt - pingSentAt);
        updateOffset(data.time, receivedAt, lastRtt);
    } else if (data.type === 'time') {
        updateOffset(data.time, receivedAt, Math.max(lastRtt, 0));
    }
}

function scheduleReconnect() {
    if (reconnectTimer !== null) {
        return;
    }

    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectSocket();
    }, delay);
}

function handleDisconnect() {
    stopPing();
    setStatus('offline');
    startFallback();
    scheduleReconnect();
}

function forceReconnect() {
    const socket = ws;
    ws = null;
    stopPing();

    if (socket) {
        try {
            socket.close();
        } catch {
        }
    }

    handleDisconnect();
}

function connectSocket() {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        return;
    }

    ws = null;
    socketCreatedAt = localNow();

    if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    stopFallback();
    setStatus('connecting');

    let socket;

    try {
        socket = new WebSocket(WS_URL);
    } catch {
        handleDisconnect();
        return;
    }

    ws = socket;

    socket.addEventListener('open', () => {
        if (ws !== socket) {
            return;
        }

        reconnectDelay = RECONNECT_MIN;
        lastMessageAt = localNow();
        setStatus('online');
        sendPing();
        startPing();
    });

    socket.addEventListener('message', (event) => {
        if (ws !== socket) {
            return;
        }

        handleMessage(event);
    });

    socket.addEventListener('close', () => {
        if (ws !== socket) {
            return;
        }

        ws = null;
        handleDisconnect();
    });

    socket.addEventListener('error', () => {
        try {
            socket.close();
        } catch {
        }
    });
}

function startFallback() {
    if (fallbackTimer !== null) {
        return;
    }

    pollTime();
    fallbackTimer = setInterval(pollTime, FALLBACK_INTERVAL);
}

function stopFallback() {
    if (fallbackTimer !== null) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
    }
}

async function pollTime() {
    if (fallbackBusy) {
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        stopFallback();
        return;
    }

    fallbackBusy = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const sentAt = localNow();
        const response = await fetch(HTTP_URL, {
            cache: 'no-store',
            signal: controller.signal
        });
        const receivedAt = localNow();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (typeof data.time !== 'number' || !Number.isFinite(data.time)) {
            throw new Error('invalid response');
        }

        updateOffset(data.time, receivedAt, receivedAt - sentAt);
        setStatus('fallback');
    } catch {
        if (!(ws && ws.readyState === WebSocket.OPEN)) {
            setStatus('offline');
        }
    } finally {
        clearTimeout(timeout);
        fallbackBusy = false;
    }
}

function nowTime() {
    const timestamp = synced
        ? localNow() + serverOffset
        : Date.now();

    return new Date(timestamp);
}

function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w > h;

    const timeSize = isLandscape
        ? Math.min(w * 0.12, h * 0.32)
        : w * 0.17;

    const dateSize = isLandscape
        ? timeSize * 0.48
        : timeSize * 0.52;

    elTime.style.fontSize = `${timeSize}px`;
    elDate.style.fontSize = `${dateSize}px`;
}

function tick() {
    const now = nowTime();

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    elTime.textContent = `${h}:${m}:${s}`;

    const y = String(now.getFullYear() % 100).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    elDate.textContent = `${y}/${mo}/${d}`;

    requestAnimationFrame(tick);
}

setInterval(() => {
    if (!ws) {
        return;
    }

    if (ws.readyState === WebSocket.OPEN) {
        if (localNow() - lastMessageAt > STALE_TIMEOUT) {
            forceReconnect();
        }

        return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
        if (localNow() - socketCreatedAt > STALE_TIMEOUT) {
            forceReconnect();
        }

        return;
    }

    forceReconnect();
}, 5000);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
        return;
    }

    if (!ws) {
        reconnectDelay = RECONNECT_MIN;

        if (reconnectTimer !== null) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        connectSocket();
    } else if (ws.readyState === WebSocket.OPEN) {
        sendPing();
    }
});

window.addEventListener('online', () => {
    if (!ws) {
        reconnectDelay = RECONNECT_MIN;
        connectSocket();
    }
});

window.addEventListener('offline', () => {
    setStatus('offline');
});

window.addEventListener('resize', layout);

layout();
tick();
connectSocket();
