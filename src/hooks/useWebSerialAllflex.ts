import { useCallback, useEffect, useRef, useState } from 'react';

export type ModoBaston = 'com' | 'rodeocontrol';

interface Options {
    onScan: (eid: string) => void;
    baudRate?: number;
    modo?: ModoBaston;
}

interface HookReturn {
    isConectado: boolean;
    error: string | null;
    conectarPuerto: () => Promise<void>;
    desconectar: () => Promise<void>;
    enviarComando: (cmd: string) => Promise<void>;
}

const RC_PREFIX = 'RC:';

export function useWebSerialAllflex({ onScan, baudRate = 9600, modo = 'com' }: Options): HookReturn {
    const [isConectado, setIsConectado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const portRef = useRef<SerialPort | null>(null);
    const onScanRef = useRef(onScan);
    useEffect(() => { onScanRef.current = onScan; });

    // El modo puede cambiar en runtime; el bucle de lectura lo lee por ref
    const modoRef = useRef(modo);
    useEffect(() => { modoRef.current = modo; });

    const desconectar = useCallback(async () => {
        setIsConectado(false);
        try { await readerRef.current?.cancel(); } catch { /* AbortError esperado */ }
    }, []);

    const enviarComando = useCallback(async (cmd: string) => {
        if (!portRef.current?.writable) return;
        try {
            const writer = portRef.current.writable.getWriter();
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(cmd + '\n'));
            writer.releaseLock();
        } catch (err) {
            console.error('[enviarComando]', err);
        }
    }, []);

    const conectarPuerto = useCallback(async () => {
        if (!('serial' in navigator)) {
            setError('Web Serial API no disponible. Usá Google Chrome o Microsoft Edge.');
            return;
        }
        setError(null);
        let port: SerialPort;
        try {
            // Autoconexión: si hay exactamente un puerto autorizado, conectar sin picker
            const puertosConocidos = await navigator.serial.getPorts();
            if (puertosConocidos.length === 1) {
                port = puertosConocidos[0];
            } else {
                port = await navigator.serial.requestPort();
            }
            await port.open({ baudRate });
        } catch (err: unknown) {
            const domErr = err as DOMException;
            // NotFoundError = usuario cerró el selector sin elegir puerto → no es un error
            if (domErr?.name !== 'NotFoundError') {
                setError('No se pudo abrir el puerto: ' + (domErr?.message ?? 'error desconocido'));
            }
            return;
        }
        portRef.current = port;
        setIsConectado(true);
        const decoder = new TextDecoder();
        const reader = port.readable!.getReader();
        readerRef.current = reader;
        let buffer = '';
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!value?.length) continue;
                buffer += decoder.decode(value, { stream: true });
                let idx: number;
                while ((idx = buffer.search(/[\r\n]/)) !== -1) {
                    const raw = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx).replace(/^[\r\n]+/, '');
                    if (!raw.length) continue;
                    let eid = raw;
                    if (raw.startsWith(RC_PREFIX)) {
                        eid = raw.slice(RC_PREFIX.length).trim();
                    } else if (modoRef.current === 'rodeocontrol') {
                        // Modo RodeoControl exige prefijo RC: — descartar sin él
                        continue;
                    }
                    if (eid.length > 0) onScanRef.current(eid);
                }
            }
        } catch (err: unknown) {
            const domErr = err as DOMException;
            // AbortError = desconexión limpia iniciada por nosotros → no mostrar error
            if (domErr?.name !== 'AbortError') {
                setError('Conexión interrumpida: ' + (domErr?.message ?? 'error desconocido'));
            }
        } finally {
            try { reader.releaseLock(); } catch { /* ya liberado */ }
            try { await port.close(); } catch { /* ya cerrado */ }
            portRef.current = null;
            readerRef.current = null;
            setIsConectado(false);
        }
    }, [baudRate]);

    // Cleanup al desmontar el componente que use el hook
    useEffect(() => () => { desconectar(); }, [desconectar]);
    return { isConectado, error, conectarPuerto, desconectar, enviarComando };
}
