const FORMULA_PREFIX = /^[\t\n\r ]*[=+\-@]/;

/** Quote CSV text and force spreadsheet formulas to remain literal text. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
