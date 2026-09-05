"use client";

import { AnimatedNavLink as Link } from "@/app/AnimatedNavLink";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardPenLine,
  ClipboardList,
  History,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  ScanLine,
  ShieldCheck,
  TicketCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PermissionKey } from "@/lib/dashboard/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: typeof House;
  permission?: PermissionKey;
  anyPermissions?: readonly PermissionKey[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const memberItems: NavItem[] = [
  { href: "/membru", label: "Prezentare", icon: House },
  { href: "/membru/qr", label: "Codul meu QR", icon: QrCode },
  { href: "/membru/intalniri", label: "Întâlniri", icon: CalendarDays },
  { href: "/membru/prezenta", label: "Prezență", icon: ClipboardList },
  { href: "/membru/profil", label: "Profil", icon: UserRound },
];

const boardOverviewItem: NavItem = {
  href: "/board",
  label: "Panou board",
  icon: LayoutDashboard,
  permission: "view_board_dashboard",
};

const boardGroups: NavGroup[] = [
  {
    label: "Club și întâlniri",
    items: [
      { href: "/board/intalniri", label: "Întâlniri", icon: CalendarDays, permission: "manage_meetings" },
      { href: "/board/scaneaza-prezenta", label: "Scanează prezența", icon: ScanLine, permission: "scan_meeting_attendance" },
      { href: "/board/prezenta", label: "Evidență prezență", icon: ClipboardList, permission: "view_attendance_roster" },
      { href: "/board/membri", label: "Membri", icon: UserRound, permission: "manage_members" },
    ],
  },
  {
    label: "Recrutare",
    items: [
      { href: "/board/formular-inscrieri", label: "Campanie", icon: ClipboardList, permission: "manage_recruitment_campaigns" },
      {
        href: "/board/interviuri",
        label: "Formulare",
        icon: ClipboardPenLine,
        anyPermissions: ["evaluate_recruitment_forms", "evaluate_interview_candidates"],
      },
    ],
  },
  {
    label: "Evenimente",
    items: [
      { href: "/board/evenimente", label: "Evenimente", icon: TicketCheck, permission: "manage_public_events" },
      { href: "/board/scaneaza-bilete", label: "Scanează bilete", icon: ScanLine, permission: "scan_event_tickets" },
      { href: "/board/istoric-scanari", label: "Istoric scanări", icon: History, permission: "view_scan_audit_log" },
    ],
  },
  {
    label: "Administrare",
    items: [
      { href: "/board/echipa", label: "Roluri echipă", icon: UsersRound, permission: "manage_staff_assignments" },
      { href: "/board/permisiuni", label: "Permisiuni", icon: ShieldCheck, permission: "manage_permissions" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/membru" || href === "/board"
    ? pathname === href
    : pathname.startsWith(href);
}

export function DashboardNav({
  fullName,
  role,
  roles,
  permissionKeys,
}: {
  fullName: string;
  role: string | null;
  roles: readonly string[];
  permissionKeys: readonly PermissionKey[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const permissions = new Set(permissionKeys);
  const visibleBoardOverview = !boardOverviewItem.permission
    || permissions.has(boardOverviewItem.permission);
  const visibleBoardGroups = boardGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => (
          (!item.permission || permissions.has(item.permission))
          && (!item.anyPermissions || item.anyPermissions.some((permission) => permissions.has(permission)))
        ),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const firstBoardHref = visibleBoardOverview
    ? boardOverviewItem.href
    : visibleBoardGroups[0]?.items[0]?.href;
  const hasBoardSpace = Boolean(firstBoardHref);
  const isBoardSpace = pathname === "/board" || pathname.startsWith("/board/");
  const roleLabel = role === "admin"
    ? "Super administrator și membru"
    : role === "board"
      ? "Board, acces operațional"
      : roles.includes("scanner") && roles.includes("interviewer")
        ? "Scanner bilete și intervievator"
        : roles.includes("scanner")
          ? "Scanner bilete și membru"
          : roles.includes("interviewer")
            ? "Intervievator și membru"
            : role === "statistici"
              ? "Statistici și membru"
              : "Membru";
  const toolsLabel = permissions.has("view_board_dashboard") ? "Board" : "Instrumente";

  useEffect(() => {
    if (!menuOpen) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const wideScreen = window.matchMedia("(min-width: 901px)");
    root.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    const closeOnWideScreen = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const controls = [...(sidebarRef.current?.querySelectorAll<HTMLElement>('.dash-sidebar-content a, .dash-sidebar-content button:not([disabled])') ?? [])]
        .filter((control) => control.getClientRects().length > 0);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    wideScreen.addEventListener("change", closeOnWideScreen);
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      root.style.overflow = previousOverflow;
      wideScreen.removeEventListener("change", closeOnWideScreen);
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function signOut() {
    setMenuOpen(false);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const closeMenu = () => setMenuOpen(false);

  const links = isBoardSpace && hasBoardSpace ? (
    <>
      <p className="dash-nav-label">Board</p>
      {visibleBoardOverview && (
        <NavLink
          item={boardOverviewItem}
          active={isActive(pathname, boardOverviewItem.href)}
          onNavigate={closeMenu}
        />
      )}
      {visibleBoardGroups.map((group) => (
        <div className="dash-nav-group" key={group.label} role="group" aria-label={group.label}>
          <p className="dash-nav-label dash-nav-label--group">{group.label}</p>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={closeMenu}
            />
          ))}
        </div>
      ))}
    </>
  ) : (
    <>
      <p className="dash-nav-label">Spațiul meu</p>
      {memberItems.map((item, index) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          onNavigate={closeMenu}
          linkRef={!hasBoardSpace && index === 0 ? firstLinkRef : undefined}
        />
      ))}
    </>
  );

  return (
    <>
      <aside ref={sidebarRef} className="dash-sidebar" data-open={menuOpen ? "true" : "false"}>
        <div className="dash-sidebar-head">
          <DashboardBrand onNavigate={() => setMenuOpen(false)} />
          <button
            ref={menuButtonRef}
            type="button"
            className="dash-menu-button"
            aria-label={menuOpen ? "Închide meniul" : "Deschide meniul"}
            aria-controls="dash-sidebar-content"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span>Meniu</span>
          </button>
        </div>
        <div className="dash-sidebar-content" id="dash-sidebar-content">
          <nav className="dash-nav" aria-label="Navigare dashboard">
            {hasBoardSpace && firstBoardHref && (
              <div className="dash-space-switch" role="group" aria-label="Schimbă spațiul">
                <Link
                  ref={firstLinkRef}
                  href="/membru"
                  aria-current={!isBoardSpace ? "true" : undefined}
                  onClick={closeMenu}
                >
                  Spațiul meu
                </Link>
                <Link
                  href={firstBoardHref}
                  aria-current={isBoardSpace ? "true" : undefined}
                  onClick={closeMenu}
                >
                  {toolsLabel}
                </Link>
              </div>
            )}
            {links}
          </nav>
          <Link
            href="/"
            replace
            className="dash-site-link"
            onClick={closeMenu}
          >
            <ArrowLeft size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>Înapoi la site</span>
          </Link>
          <div className="dash-account">
            <div className="dash-account-avatar" aria-hidden="true">
              {fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
            </div>
            <div><strong>{fullName}</strong><span>{roleLabel}</span></div>
            <button type="button" onClick={signOut} aria-label="Ieși din cont"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      {menuOpen && <button type="button" className="dash-menu-backdrop" aria-label="Închide meniul" onClick={() => setMenuOpen(false)} />}
    </>
  );
}

function DashboardBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/membru"
      className="dash-brand"
      aria-label="ITC Sf. Sava, SavaPass, pagina membrului"
      onClick={onNavigate}
    >
      <span className="dash-brand-school" aria-hidden="true">
        <strong>ITC</strong>
        <small>SF. SAVA</small>
      </span>
      <span className="dash-brand-product" aria-hidden="true">
        <strong>SavaPass</strong>
        <small>Spațiul membrilor</small>
      </span>
    </Link>
  );
}

function NavLink({ item, active, onNavigate, linkRef }: { item: NavItem; active: boolean; onNavigate: () => void; linkRef?: React.Ref<HTMLAnchorElement> }) {
  const Icon = item.icon;
  return (
    <Link ref={linkRef} href={item.href} className="dash-nav-link" aria-current={active ? "page" : undefined} onClick={onNavigate}>
      <Icon size={18} strokeWidth={1.9} />
      <span>{item.label}</span>
    </Link>
  );
}
