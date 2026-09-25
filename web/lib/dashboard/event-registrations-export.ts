import ExcelJS from "exceljs";
import { registrationStatusLabels, type EventRegistration } from "./event-registration-model";

const bucharestParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function excelDate(value: string | null): Date | null {
  if (!value) return null;
  const parts = Object.fromEntries(bucharestParts.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)));
}

export async function buildRegistrationsWorkbook(rows: EventRegistration[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SavaPass";
  const sheet = workbook.addWorksheet("Înscrieri", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Eveniment", key: "event", width: 31 },
    { header: "Participant", key: "name", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Telefon", key: "phone", width: 18 },
    { header: "Tip bilet", key: "ticketType", width: 22 },
    { header: "Cod bilet", key: "code", width: 17 },
    { header: "Status", key: "status", width: 16 },
    { header: "Preț (RON)", key: "price", width: 16 },
    { header: "Înscris la", key: "issuedAt", width: 21 },
    { header: "Intrat la", key: "checkedInAt", width: 21 },
  ];
  sheet.autoFilter = { from: "A1", to: "J1" };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14243A" } };
  sheet.getRow(1).height = 25;
  sheet.getColumn("price").numFmt = "#,##0.00";
  sheet.getColumn("issuedAt").numFmt = "dd.mm.yyyy hh:mm";
  sheet.getColumn("checkedInAt").numFmt = "dd.mm.yyyy hh:mm";

  for (const registration of rows) {
    sheet.addRow({
      event: registration.eventTitle,
      name: registration.holderName,
      email: registration.holderEmail,
      phone: registration.holderPhone ?? "",
      ticketType: registration.ticketType,
      code: registration.code,
      status: registrationStatusLabels[registration.status],
      price: registration.priceBani / 100,
      issuedAt: excelDate(registration.issuedAt),
      checkedInAt: excelDate(registration.checkedInAt),
    });
  }

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
