const storageKey = 'yachay.tab-session';
let initialization: Promise<void> | null = null;
let channel: BroadcastChannel | null = null;
let fingerprint = '';
let owner = false;
window.addEventListener('pagehide', () => { channel?.close(); channel = null; });
window.addEventListener('pageshow', () => {
    const token = sessionStorage.getItem(storageKey);
    if (token && !channel) void watchToken(token, true);
});

async function watchToken(token: string, probe: boolean) {
    channel?.close();
    fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), byte => byte.toString(16).padStart(2, '0')).join('');
    if (!('BroadcastChannel' in window)) return;
    channel = new BroadcastChannel('yachay.tab-owner');
    const instance = crypto.randomUUID();
    owner = !probe;
    channel.onmessage = ({ data }) => {
        if (data?.fingerprint !== fingerprint || data?.instance === instance) return;
        if (data.type === 'probe' && owner) channel?.postMessage({ type: 'owned', fingerprint, instance });
        if (data.type === 'owned' && !owner) clearTabSession();
    };
    if (probe) {
        channel.postMessage({ type: 'probe', fingerprint, instance });
        await new Promise(resolve => setTimeout(resolve, 75));
        owner = Boolean(sessionStorage.getItem(storageKey));
    }
}

export function clearTabSession() {
    sessionStorage.removeItem(storageKey);
    fingerprint = '';
    owner = false;
}

export function initializeTabSession(): Promise<void> {
    if (initialization) return initialization;
    initialization = (async () => {
        const token = sessionStorage.getItem(storageKey);
        if (!token) return;
        if (!('BroadcastChannel' in window)) return;
        await watchToken(token, true);
    })();
    return initialization;
}

export async function tabSessionToken(create = false): Promise<string | null> {
    await initializeTabSession();
    let token = sessionStorage.getItem(storageKey);
    if (!token && create) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem(storageKey, token);
        await watchToken(token, false);
    }
    return token;
}
