import { BulkRowDto } from "@/types";

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = FRENCH_MONTHS[parts[1]];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
  }
  return null;
}

function isValidTextFile(content: string): boolean {
  if (content.startsWith("PK") || content.startsWith("\0")) return false;
  const printableChars = (content.match(/[\x20-\x7E\t\n\r]/g) || []).length;
  return printableChars / content.length > 0.8;
}

function detectDelimiter(headerLine: string): string {
  const t = (headerLine.match(/\t/g) || []).length;
  const c = (headerLine.match(/,/g) || []).length;
  const s = (headerLine.match(/;/g) || []).length;
  const max = Math.max(t, c, s);
  if (max === 0) return ",";
  if (t === max) return "\t";
  if (s === max) return ";";
  return ",";
}

function cleanCol(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

export function parseCSV(content: string): BulkRowDto[] {
  if (!isValidTextFile(content)) throw new Error('Format de fichier invalide.');
  const lines = content.split("\n").flatMap((l) => {
    const trimmed = l.trim();
    return trimmed ? [trimmed] : [];
  });
  if (lines.length < 2) throw new Error('Le fichier est vide.');

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).flatMap(h => {
    const cleaned = cleanCol(h);
    return cleaned ? [cleaned] : [];
  });
  const dateIdx = headers.findIndex(h => h.toLowerCase() === "date");

  if (dateIdx === -1) throw new Error(`Colonne "Date" manquante.`);

  return lines.slice(1).reduce((acc, line) => {
    const vals = line.split(delimiter).map(v => cleanCol(v));
    const d = parseDate(vals[dateIdx]);
    if (d) {
      const fields: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (i !== dateIdx && h && vals[i]) fields[h] = vals[i];
      });
      acc.push({ 
        tempId: Math.random().toString(36).substring(2, 11),
        date: d.toISOString().split("T")[0], 
        fields 
      });
    }
    return acc;
  }, [] as BulkRowDto[]);
}
