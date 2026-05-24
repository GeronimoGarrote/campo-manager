import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
    onScan: (eid: string) => void;
    baudRate?: number;
}

interface HookReturn {
    isConectado: boolean;
    error: string | null;
    conectarPuerto: () => Promise<void>;
    desconectar: () => Promise<void>;
}

export function useWebSerialAllflex({ onScan, baudRate = 9600 }: Options): HookReturn {
    const [isConectado, setIsConectado] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs para poder cancelar desde fuera del bucle de lectura
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const portRef   = useRef<SerialPort | null>(null);
    const onScanRef = useRef(onScan);
    useEffect(() => { onScanRef.current = onScan; });

    const desconectar = useCallback(async () => {
        // Cancela el reader; el bucle detecta done=true y cierra el puerto en su finally
        setIsConectado(false);
        try { await readerRef.current?.cancel(); } catch { /* AbortError esperado */ }
    }, []);

    const conectarPuerto = useCallback(async () => {
        if (!('serial' in navigator)) {
            setError('Web Serial API no disponible. Usá Google Chrome o Microsoft Edge.');
            return;
        }

        setError(null);

        // ── 1. Selector de puerto (requiere gesto del usuario) ──────────────
        let port: SerialPort;
        try {
            port = await navigator.serial.requestPort();
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

        // ── 2. Lectura del stream ─────────────────────────────────────────────
        const decoder = new TextDecoder();
        const reader  = port.readable!.getReader();
        readerRef.current = reader;
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!value?.length) continue;

                buffer += decoder.decode(value, { stream: true });

                // El RS420 termina cada EID con \r, \n o \r\n
                let idx: number;
                while ((idx = buffer.search(/[\r\n]/)) !== -1) {
                    const eid = buffer.slice(0, idx).trim();
                    // Consumir todos los chars de terminador consecutivos
                    buffer = buffer.slice(idx).replace(/^[\r\n]+/, '');
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
            // ── 3. Cleanup garantizado aunque el bucle falle ─────────────────
            try { reader.releaseLock(); }    catch { /* ya liberado */ }
            try { await port.close(); }      catch { /* ya cerrado  */ }
            portRef.current   = null;
            readerRef.current = null;
            setIsConectado(false);
        }
    }, [baudRate]);

    // Cleanup al desmontar el componente que use el hook
    useEffect(() => () => { desconectar(); }, [desconectar]);

    return { isConectado, error, conectarPuerto, desconectar };
}
