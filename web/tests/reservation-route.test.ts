import assert from "node:assert/strict";
import test from "node:test";

import { resolveReservationRoute } from "../lib/reservation-route";

test("the reservation gateway sends visitors to the event archive when none are active", () => {
  assert.deepEqual(resolveReservationRoute([]), {
    kind: "redirect",
    href: "/evenimente",
  });
});

test("the reservation gateway skips selection when exactly one event is active", () => {
  assert.deepEqual(resolveReservationRoute([{ slug: "echoes-unplugged" }]), {
    kind: "redirect",
    href: "/echoes-unplugged/checkout",
  });
});

test("the reservation gateway shows selection when several events are active", () => {
  assert.deepEqual(
    resolveReservationRoute([
      { slug: "echoes-unplugged" },
      { slug: "cupid-fest" },
    ]),
    { kind: "choose" },
  );
});
