import { useEffect, useRef } from 'react';

interface Options {
    isActive: boolean;
    onScan: (eid: string) => void;
    minLength?: number;
    speedThresholdMs?: number;
}

export function useLectorAllflex({
    isActive,
    onScan,
    minLength = 5,
    speedThresholdMs = 50,
}: Options) {
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    // Siempre apunta a la versión más reciente del callback, evitando stale closures
    const onScanRef = useRef(onScan);
    useEffect(() => { onScanRef.current = onScan; });

    useEffect(() => {
        if (!isActive) {
            bufferRef.current = '';
            return;
        }

        function handleKeyDown(e: KeyboardEvent) {
            const now = Date.now();
            const elapsed = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            if (e.key === 'Enter') {
                e.preventDefault();
                const eid = bufferRef.current;
                bufferRef.current = '';
                if (eid.length >= minLength) {
                    onScanRef.current(eid);
                }
                return;
            }

            // Ignorar teclas modificadoras o de función
            if (e.key.length !== 1) return;

            // Tiempo mayor al umbral → teclado humano, limpiar buffer
            if (elapsed > speedThresholdMs) {
                bufferRef.current = '';
            }

            bufferRef.current += e.key;
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, minLength, speedThresholdMs]);
}
