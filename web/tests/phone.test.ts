import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRomanianPhone } from "../lib/phone";

test("normalizează formatele românești uzuale la același număr", () => {
  assert.equal(normalizeRomanianPhone("0722 123 456"), "+40722123456");
  assert.equal(normalizeRomanianPhone("+40 722 123 456"), "+40722123456");
  assert.equal(normalizeRomanianPhone("0040-722-123-456"), "+40722123456");
});

test("respinge numere incomplete sau din altă țară", () => {
  assert.equal(normalizeRomanianPhone("0722 123"), null);
  assert.equal(normalizeRomanianPhone("+33 6 12 34 56 78"), null);
  assert.equal(normalizeRomanianPhone("telefon"), null);
});
