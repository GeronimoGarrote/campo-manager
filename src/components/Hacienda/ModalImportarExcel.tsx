import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Modal, Stack, Group, Button, FileInput, Table, Badge, Alert, Text } from '@mantine/core';
import { IconFileSpreadsheet, IconUpload, IconDownload, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { supabase } from '../../supabase';

interface ModalImportarExcelProps {
    opened: boolean;
    onClose: () => void;
    establecimientoId: string;
    animalesActivos: number;
    datosSuscripcion: { limite_animales: number; plan_nombre: string } | null;
    animalesExistentes: { caravana: string }[];
    onImportComplete: () => void;
}

type RowStatus = 'OK' | 'DUPLICADA' | 'CATEGORIA_INVALIDA' | 'SEXO_INVALIDO' | 'ADVERTENCIA';

interface ParsedRow {
    rowIndex: number;
    caravana: string;
    categoriaRaw: string;
    categoriaNorm: string;
    sexoRaw: string;
    sexoFinal: string;
    status: RowStatus;
    statusLabel: string;
    statusColor: string;
}

const CATEGORIAS_VALIDAS = ['Vaca', 'Vaquillona', 'Ternera', 'Ternero', 'Novillo', 'Toro'];

function normalizarCategoria(raw: string): string {
    const s = raw.trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normalizarSexo(sexoRaw: string, categoriaNorm: string): string {
    // categorías con sexo fijo, ignorar columna Sexo
    if (['Vaca', 'Vaquillona', 'Ternera'].includes(categoriaNorm)) return 'H';
    if (categoriaNorm === 'Toro') return 'M';
    // Ternero y Novillo: respetar columna Sexo, fallback a M si está vacío
    const s = sexoRaw.trim().toUpperCase().replace(/\s+/g, '');
    if (s === 'H' || s === 'HEMBRA' || s === 'FEM' || s === 'FEMALE' || s === 'F') return 'H';
    if (s === 'M' || s === 'MACHO' || s === 'MALE' || s === 'MAC') return 'M';
    if (s === '') {
        if (categoriaNorm === 'Ternero') return 'M';
        if (categoriaNorm === 'Novillo') return 'M';
    }
    return s;
}

function detectarColumnas(headerRow: unknown[]): { idxCaravana: number; idxCategoria: number; idxSexo: number } {
    let idxCaravana = 0, idxCategoria = 1, idxSexo = 2;
    headerRow.forEach((cell, i) => {
        if (cell == null) return;
        const h = String(cell).trim().toUpperCase();
        if (h === 'CARAVANA') idxCaravana = i;
        else if (h === 'CATEGORIA' || h === 'CATEGORÍA') idxCategoria = i;
        else if (h === 'SEXO') idxSexo = i;
    });
    return { idxCaravana, idxCategoria, idxSexo };
}

function parseRows(rawRows: unknown[][], animalesExistentes: { caravana: string }[]): ParsedRow[] {
    const caravanasEnLote = new Set<string>();
    const parsed: ParsedRow[] = [];

    if (rawRows.length === 0) return parsed;
    const { idxCaravana, idxCategoria, idxSexo } = detectarColumnas(rawRows[0] as unknown[]);

    rawRows.slice(1).forEach((row, idx) => {
        if (!row || (row as unknown[]).every((cell) => cell === undefined || cell === null || cell === '')) return;

        const caravana = row[idxCaravana] != null ? String(row[idxCaravana]).trim().toUpperCase() : '';
        const categoriaRaw = row[idxCategoria] != null ? String(row[idxCategoria]).trim() : '';
        const sexoRaw = row[idxSexo] != null ? String(row[idxSexo]).trim() : '';
        const categoriaNorm = normalizarCategoria(categoriaRaw);
        const sexoFinal = normalizarSexo(sexoRaw, categoriaNorm);

        let status: RowStatus = 'OK';
        let statusLabel = 'OK';
        let statusColor = 'green';

        if (!caravana) {
            status = 'ADVERTENCIA';
            statusLabel = 'Sin caravana';
            statusColor = 'orange';
        } else if (
            caravanasEnLote.has(caravana) ||
            animalesExistentes.some(a => a.caravana.toLowerCase() === caravana.toLowerCase())
        ) {
            status = 'DUPLICADA';
            statusLabel = 'Duplicada';
            statusColor = 'red';
        } else if (!CATEGORIAS_VALIDAS.includes(categoriaNorm)) {
            status = 'CATEGORIA_INVALIDA';
            statusLabel = 'Categoría inválida';
            statusColor = 'red';
        } else if (!['H', 'M'].includes(sexoFinal)) {
            status = 'SEXO_INVALIDO';
            statusLabel = 'Sexo inválido';
            statusColor = 'red';
        }

        if (status === 'OK') caravanasEnLote.add(caravana);

        parsed.push({ rowIndex: idx + 2, caravana, categoriaRaw, categoriaNorm, sexoRaw, sexoFinal, status, statusLabel, statusColor });
    });

    return parsed;
}

export default function ModalImportarExcel({
    opened,
    onClose,
    establecimientoId,
    animalesActivos,
    datosSuscripcion,
    animalesExistentes,
    onImportComplete,
}: ModalImportarExcelProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState<string | null>(null);

    const esIlimitado = !datosSuscripcion || datosSuscripcion.limite_animales >= 9999;
    const limiteSuscripcion = datosSuscripcion?.limite_animales ?? 9999;

    const validRows = parsedRows.filter(r => r.status === 'OK');
    const errorRows = parsedRows.filter(r => r.status !== 'OK');
    const espacioDisponible = esIlimitado ? validRows.length : Math.max(0, limiteSuscripcion - animalesActivos);
    const filasImportables = validRows.slice(0, espacioDisponible);
    const limitadoPorPlan = !esIlimitado && validRows.length > espacioDisponible;

    async function descargarPlantilla() {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Animales');

        ws.columns = [
            { key: 'caravana', width: 16 },
            { key: 'categoria', width: 16 },
            { key: 'sexo', width: 10 },
        ];

        const headerRow = ws.getRow(1);
        ['Caravana', 'Categoria', 'Sexo'].forEach((title, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = title;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B7A3E' } };
        });
        headerRow.commit();

        ws.addRow([1234, 'Vaca', 'H']);
        ws.addRow([5678, 'Novillo', 'M']);
        ws.addRow([9012, 'Ternera', 'H']);

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Plantilla_Importacion.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleFileChange(f: File | null) {
        setFile(f);
        setImportError(null);
        setImportSuccess(null);
        setParsedRows([]);
        if (!f) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target?.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
                setParsedRows(parseRows(rawRows, animalesExistentes));
            } catch {
                setImportError('Error al leer el archivo. Asegurate de que sea un .xlsx o .xls válido.');
            }
        };
        reader.readAsArrayBuffer(f);
    }

    async function handleImport() {
        if (filasImportables.length === 0) return;

        if (!esIlimitado && (animalesActivos + filasImportables.length) > limiteSuscripcion) {
            setImportError(`Tu plan ${datosSuscripcion?.plan_nombre} permite ${limiteSuscripcion} animales. Tenés ${animalesActivos} activos y estás intentando importar ${filasImportables.length}. Superás el límite.`);
            return;
        }

        setLoading(true);
        setImportError(null);

        try {
            const payload = filasImportables.map(row => ({
                caravana: row.caravana,
                categoria: row.categoriaNorm,
                sexo: row.sexoFinal,
                origen: 'COMPRADO',
                estado: 'ACTIVO',
                condicion: 'SANA',
                establecimiento_id: establecimientoId,
            }));

            const { error } = await supabase.from('animales').insert(payload);

            if (error) {
                setImportError('Error al importar: ' + error.message);
            } else {
                setImportSuccess(`¡${filasImportables.length} animal${filasImportables.length !== 1 ? 'es' : ''} importado${filasImportables.length !== 1 ? 's' : ''} exitosamente!`);
                onImportComplete();
                setTimeout(() => {
                    handleClose();
                }, 1800);
            }
        } catch {
            setImportError('Error inesperado al importar.');
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        setFile(null);
        setParsedRows([]);
        setImportError(null);
        setImportSuccess(null);
        onClose();
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={<Text fw={700} size="lg">Importar Hacienda desde Excel</Text>}
            centered
            size="xl"
        >
            <Stack>
                <Group align="flex-end" gap="sm">
                    <FileInput
                        label="Archivo Excel"
                        placeholder="Seleccioná tu archivo .xlsx o .xls"
                        accept=".xlsx,.xls"
                        value={file}
                        onChange={handleFileChange}
                        leftSection={<IconFileSpreadsheet size={16} />}
                        style={{ flex: 1 }}
                        clearable
                    />
                    <Button
                        variant="outline"
                        color="green"
                        leftSection={<IconDownload size={16} />}
                        onClick={descargarPlantilla}
                        mb={1}
                    >
                        Descargar plantilla
                    </Button>
                </Group>

                {!file && (
                    <Alert color="blue" title="Formato esperado">
                        <Text size="sm">Columnas: <strong>Caravana | Categoria | Sexo</strong></Text>
                        <Text size="sm" mt={4}>Categorías válidas: Vaca, Vaquillona, Ternera, Ternero, Novillo, Toro</Text>
                        <Text size="sm">Sexo válido: H (hembra), M (macho)</Text>
                    </Alert>
                )}

                {parsedRows.length > 0 && (
                    <>
                        <Group gap="xs">
                            <Badge color="gray" variant="light" size="lg">Total: {parsedRows.length}</Badge>
                            <Badge color="green" variant="light" size="lg">Válidas: {validRows.length}</Badge>
                            {errorRows.length > 0 && (
                                <Badge color="red" variant="light" size="lg">Con errores: {errorRows.length}</Badge>
                            )}
                        </Group>

                        {limitadoPorPlan && (
                            <Alert color="orange" title="Límite de plan" icon={<IconAlertCircle size={16} />}>
                                Tu plan <strong>{datosSuscripcion?.plan_nombre}</strong> permite {limiteSuscripcion} animales
                                y ya tenés {animalesActivos} activos. Solo podés importar <strong>{espacioDisponible}</strong> de
                                los {validRows.length} animales válidos. Se importarán los primeros {espacioDisponible}.
                            </Alert>
                        )}

                        {espacioDisponible === 0 && !esIlimitado && (
                            <Alert color="red" title="Límite alcanzado" icon={<IconAlertCircle size={16} />}>
                                Tu plan no permite más animales. Mejorá tu plan para poder importar.
                            </Alert>
                        )}

                        <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                            <Table striped style={{ minWidth: 480 }}>
                                <Table.Thead bg="gray.1" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <Table.Tr>
                                        <Table.Th w={50}>#</Table.Th>
                                        <Table.Th>Caravana</Table.Th>
                                        <Table.Th>Categoría</Table.Th>
                                        <Table.Th>Sexo</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {parsedRows.map((row, idx) => (
                                        <Table.Tr
                                            key={idx}
                                            bg={row.status !== 'OK' ? 'red.0' : undefined}
                                        >
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">{row.rowIndex}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text fw={600} size="sm">{row.caravana || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{row.categoriaRaw || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{row.sexoFinal || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={row.statusColor} size="sm">
                                                    {row.statusLabel}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>
                    </>
                )}

                {importError && (
                    <Alert color="red" title="Error" icon={<IconAlertCircle size={16} />}>
                        {importError}
                    </Alert>
                )}

                {importSuccess && (
                    <Alert color="green" title="¡Éxito!" icon={<IconCircleCheck size={16} />}>
                        {importSuccess}
                    </Alert>
                )}

                {parsedRows.length > 0 && !importSuccess && (
                    <Button
                        leftSection={<IconUpload size={18} />}
                        color="teal"
                        size="md"
                        loading={loading}
                        disabled={filasImportables.length === 0}
                        onClick={handleImport}
                    >
                        Importar {filasImportables.length} animal{filasImportables.length !== 1 ? 'es' : ''}
                    </Button>
                )}
            </Stack>
        </Modal>
    );
}
