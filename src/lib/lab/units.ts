const KI = 1024;
const MI = KI * 1024;
const GI = MI * 1024;
const MEMORY_UNITS: Record<string, number> = { "": 1, k: 1e3, M: 1e6, G: 1e9, Ki: KI, Mi: MI, Gi: GI };

// "128Mi" -> bytes
export function parseMemory(value: string | undefined): number | null {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|k|M|G)?$/);
  return match ? Number(match[1]) * MEMORY_UNITS[match[2] ?? ""] : null;
}

// "250m" or "1.5" -> millicores
export function parseCpu(value: string | undefined): number | null {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)(m)?$/);
  if (match === null || match === undefined) return null;
  return match[2] ? Number(match[1]) : Number(match[1]) * 1000;
}

export function formatMemory(bytes: number): string {
  if (bytes >= GI && bytes % GI === 0) return `${bytes / GI}Gi`;
  if (bytes % MI === 0) return `${bytes / MI}Mi`;
  return `${Math.round(bytes / KI)}Ki`;
}

export function formatCpu(millicores: number): string {
  return millicores % 1000 === 0 ? String(millicores / 1000) : `${millicores}m`;
}

// Quota keys: "pods", "requests.cpu", "limits.memory", ...
export function parseQuantity(key: string, value: string | undefined): number | null {
  if (key.endsWith("memory")) return parseMemory(value);
  if (key.endsWith("cpu")) return parseCpu(value);
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

export function formatQuantity(key: string, value: number): string {
  if (key.endsWith("memory")) return formatMemory(value);
  if (key.endsWith("cpu")) return formatCpu(value);
  return String(value);
}
