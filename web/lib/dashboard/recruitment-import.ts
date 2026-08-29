import { createHash } from "node:crypto";
import { readSheet } from "read-excel-file/node";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_COLUMNS = 200;

export interface ParsedRecruitmentFile {
  headers: string[];
  rows: Record<string, string>[];
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"' && cell === "") quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (character === "\r" && text[index + 1] === "\n") { /* handled by \n */ }
    else cell += character;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function rowsToRecords(rawRows: unknown[][]): ParsedRecruitmentFile {
  if (rawRows.length < 1) throw new Error("Fișierul nu conține un rând de antet.");
  if (rawRows.length - 1 > MAX_IMPORT_ROWS) throw new Error(`Fișierul depășește limita de ${MAX_IMPORT_ROWS} de rânduri.`);
  if (rawRows[0].length > MAX_IMPORT_COLUMNS) throw new Error(`Fișierul depășește limita de ${MAX_IMPORT_COLUMNS} de coloane.`);
  const headers = rawRows[0].map(cellText);
  if (headers[0]?.charCodeAt(0) === 0xfeff) headers[0] = headers[0].slice(1);
  if (headers.some((header) => header === "")) throw new Error("Fișierul conține o coloană fără antet.");
  if (new Set(headers).size !== headers.length) throw new Error("Fișierul conține antete duplicate.");
  const rows = rawRows.slice(1).map((values, rowIndex) => {
    if (values.length > headers.length) throw new Error(`Rândul ${rowIndex + 2} are mai multe valori decât antete.`);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, cellText(values[columnIndex])]));
  });
  return { headers, rows };
}

export async function parseRecruitmentFile(fileName: string, buffer: Buffer): Promise<ParsedRecruitmentFile> {
  if (!buffer.length) throw new Error("Fișierul este gol.");
  if (buffer.length > MAX_IMPORT_BYTES) throw new Error("Fișierul depășește limita de 10 MB.");
  const extension = fileName.toLocaleLowerCase("ro").split(".").pop();
  if (extension === "csv") return rowsToRecords(parseCsvRows(buffer.toString("utf8")));
  if (extension === "xlsx") {
    const rows = await readSheet<string>(buffer, {
      trim: false,
      parseNumber: (value) => value,
    });
    return rowsToRecords(rows as unknown[][]);
  }
  throw new Error("Format neacceptat. Încarcă un fișier CSV sau XLSX.");
}

export function importFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function stableSourceRowIdentifier(sourcePayload: Record<string, string>, answers: Record<string, string>): string | null {
  const explicit = sourcePayload["Application ID"] || sourcePayload["ID aplicație"];
  if (explicit?.trim()) return `id:${explicit.trim()}`;
  const email = (answers.email || answers.respondent_email || sourcePayload["Email address"] || "").trim().toLocaleLowerCase("ro");
  const timestamp = (answers.timestamp || sourcePayload.Timestamp || "").trim();
  if (!email || !timestamp) return null;
  return `email-time:${createHash("sha256").update(`${email}\u0000${timestamp}`).digest("hex")}`;
}

export function parseSubmittedAt(value: string): string | null {
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  const european = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!european) return null;
  const [, day, month, year, hour = "0", minute = "0", second = "0"] = european;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
