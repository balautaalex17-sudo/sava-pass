"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { NotePencilIcon } from "@phosphor-icons/react/dist/csr/NotePencil";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { ConfettiIcon } from "@phosphor-icons/react/dist/csr/Confetti";

const STEPS = [
  { id: "application", Icon: NotePencilIcon },
  { id: "confirmation", Icon: EnvelopeSimpleIcon },
  { id: "interview", Icon: CalendarCheckIcon },
  { id: "welcome", Icon: ConfettiIcon },
] as const;

const subscribe = () => () => undefined;

export function JoinStepIcons() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) return null;

  return (
    <>
      {STEPS.map(({ id, Icon }) => {
        const host = document.querySelector<HTMLElement>(`[data-join-icon="${id}"]`);
        if (!host) return null;

        return createPortal(
          <Icon className="join-step-icon" size={24} weight="duotone" aria-hidden="true" />,
          host,
          id,
        );
      })}
    </>
  );
}
