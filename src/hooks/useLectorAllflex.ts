import { useEffect, useRef } from 'react';

interface Options {
    isActive: boolean;
    onScan: (eid: string) => void;
    minLength?: number;
    // Tiempo máximo entre teclas para considerarlas del bastón (no del humano)
    speedThresholdMs?: number;
    // Tiempo de inactividad para disparar sin Enter (fallback para bastones sin terminador)
    idleTimeoutMs?: number;
}

export function useLectorAllflex({
    isActive,
    onScan,
    minLength = 5,
    speedThresholdMs = 150,
    idleTimeoutMs = 300,
}: Options) {
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onScanRef = useRef(onScan);
    useEffect(() => { onScanRef.current = onScan; });

    useEffect(() => {
        if (!isActive) {
            bufferRef.current = '';
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            return;
        }

        function dispararScan() {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            const eid = bufferRef.current;
            bufferRef.current = '';
            if (eid.length >= minLength) {
                onScanRef.current(eid);
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            const now = Date.now();
            const elapsed = now - lastKeyTimeRef.current;

            const activeEl = document.activeElement as HTMLElement;
            const inputFocused = activeEl &&
                (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

            if (inputFocused) {
                if (bufferRef.current.length > 0 && elapsed < speedThresholdMs) {
                    // Ya tenemos buffer acumulado a velocidad de bastón:
                    // robar el evento antes de que llegue al input
                    e.preventDefault();
                    activeEl.blur();
                    // No retornar → seguir procesando la tecla abajo
                } else {
                    // Podría ser el usuario escribiendo → no interferir
                    bufferRef.current = '';
                    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                    return;
                }
            }

            lastKeyTimeRef.current = now;

            if (e.key === 'Enter' || e.key === 'Tab') {
                if (bufferRef.current.length >= minLength) {
                    e.preventDefault();
                }
                dispararScan();
                return;
            }

            if (e.key.length !== 1) return;

            if (elapsed > speedThresholdMs) {
                bufferRef.current = '';
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            }

            bufferRef.current += e.key;

            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (bufferRef.current.length >= minLength) {
                idleTimerRef.current = setTimeout(dispararScan, idleTimeoutMs);
            }
        }

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [isActive, minLength, speedThresholdMs, idleTimeoutMs]);
}
