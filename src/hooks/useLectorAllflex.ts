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
            lastKeyTimeRef.current = now;

            // Enter o retorno de carro → disparar inmediatamente
            if (e.key === 'Enter' || e.key === 'Tab') {
                if (bufferRef.current.length >= minLength) {
                    e.preventDefault();
                }
                dispararScan();
                return;
            }

            // Ignorar teclas no imprimibles (Shift, Ctrl, F1, etc.)
            if (e.key.length !== 1) return;

            // Si pasó más del umbral → era el humano, limpiar y empezar de nuevo
            if (elapsed > speedThresholdMs) {
                bufferRef.current = '';
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            }

            bufferRef.current += e.key;

            // Fallback: si no llega Enter en idleTimeoutMs, disparar igual
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (bufferRef.current.length >= minLength) {
                idleTimerRef.current = setTimeout(dispararScan, idleTimeoutMs);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [isActive, minLength, speedThresholdMs, idleTimeoutMs]);
}
