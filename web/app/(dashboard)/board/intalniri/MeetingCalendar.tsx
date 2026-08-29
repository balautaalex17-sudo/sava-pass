"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import type { Meeting } from "@/lib/supabase/types";
import { MEETING_STATUS_LABELS } from "@/lib/dashboard/meeting-constants";

const weekDays = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const total = Math.ceil((offset + days) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= days ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
}

function meetingTime(value: string) {
  return new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function MeetingCalendar({ meetings, onEdit, referenceNow }: { meetings: Meeting[]; onEdit: (meeting: Meeting) => void; referenceNow: string }) {
  const initialMonth = useMemo(() => {
    const now = new Date(referenceNow).getTime();
    const upcoming = [...meetings]
      .filter((meeting) => new Date(meeting.ends_at).getTime() >= now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    const source = upcoming ? new Date(upcoming.starts_at) : new Date(referenceNow);
    return new Date(source.getFullYear(), source.getMonth(), 1);
  }, [meetings, referenceNow]);
  const [month, setMonth] = useState(initialMonth);

  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const meeting of meetings) {
      const key = dateKey(new Date(meeting.starts_at));
      map.set(key, [...(map.get(key) ?? []), meeting]);
    }
    for (const values of map.values()) values.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }, [meetings]);

  const cells = monthCells(month);
  const monthMeetings = meetings
    .filter((meeting) => {
      const date = new Date(meeting.starts_at);
      return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const monthLabel = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(month);
  const today = dateKey(new Date(referenceNow));

  function moveMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="dash-card meeting-calendar" aria-labelledby="meeting-calendar-title">
      <div className="meeting-calendar__head">
        <div>
          <span className="dash-eyebrow">Calendar SavaPass</span>
          <h2 id="meeting-calendar-title">{monthLabel}</h2>
        </div>
        <div className="meeting-calendar__controls">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Luna precedentă"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Astăzi</button>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Luna următoare"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="meeting-calendar__grid" role="grid" aria-label={`Întâlniri în ${monthLabel}`}>
        {weekDays.map((day) => <div className="meeting-calendar__weekday" role="columnheader" key={day}>{day}</div>)}
        {cells.map((date, index) => {
          if (!date) return <div className="meeting-calendar__day meeting-calendar__day--empty" role="gridcell" key={`empty-${index}`} />;
          const key = dateKey(date);
          const dayMeetings = byDay.get(key) ?? [];
          return (
            <div className={`meeting-calendar__day${key === today ? " meeting-calendar__day--today" : ""}`} role="gridcell" key={key}>
              <time dateTime={key}>{date.getDate()}</time>
              <div>
                {dayMeetings.map((meeting) => (
                  <button type="button" onClick={() => onEdit(meeting)} key={meeting.id} title={`${meeting.title}, ${meeting.location}`}>
                    <span>{meetingTime(meeting.starts_at)}</span>{meeting.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="meeting-calendar__agenda">
        {monthMeetings.length ? monthMeetings.map((meeting) => (
          <button type="button" onClick={() => onEdit(meeting)} key={meeting.id}>
            <time dateTime={meeting.starts_at}>{new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(new Date(meeting.starts_at))}</time>
            <span><strong>{meeting.title}</strong><small><Clock3 size={13} /> {meetingTime(meeting.starts_at)} <MapPin size={13} /> {meeting.location}</small></span>
            <em>{MEETING_STATUS_LABELS[meeting.status] ?? meeting.status}</em>
          </button>
        )) : <div className="dash-empty"><strong>Nicio întâlnire în această lună</strong>Folosește „Întâlnire nouă” pentru a adăuga una.</div>}
      </div>
    </section>
  );
}
