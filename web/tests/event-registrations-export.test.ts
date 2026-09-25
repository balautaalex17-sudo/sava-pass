import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { buildRegistrationsWorkbook } from "../lib/dashboard/event-registrations-export";

test("Excel export keeps participant details, prices and Bucharest times", async () => {
  const bytes = await buildRegistrationsWorkbook([
    {
      id: "ticket-1", eventId: "event-1", eventTitle: "Concert",
      holderName: "=2+2", holderEmail: "ana@example.com", holderPhone: "+40700000000",
      code: "ABC123", ticketType: "Standard", priceBani: 4500, status: "checked_in",
      issuedAt: "2026-09-25T12:30:00.000Z", checkedInAt: "2026-09-25T15:10:00.000Z",
    },
    {
      id: "ticket-2", eventId: "event-1", eventTitle: "Concert",
      holderName: "Mara Ionescu", holderEmail: "mara@example.com", holderPhone: null,
      code: "DEF456", ticketType: "Elev", priceBani: 2500, status: "reserved",
      issuedAt: "2026-09-25T12:30:00.000Z", checkedInAt: null,
    },
  ]);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet("Înscrieri");
  assert.ok(sheet);
  assert.equal(sheet.rowCount, 3);
  assert.equal(sheet.getCell("B2").value, "=2+2");
  assert.equal(sheet.getCell("D2").value, "+40700000000");
  assert.equal(sheet.getCell("G2").value, "Intrat");
  assert.equal(sheet.getCell("H2").value, 45);
  assert.equal((sheet.getCell("I2").value as Date).toISOString(), "2026-09-25T15:30:00.000Z");
  assert.equal(sheet.getCell("G3").value, "Rezervat");
  assert.equal(sheet.getCell("J3").value, null);
});
