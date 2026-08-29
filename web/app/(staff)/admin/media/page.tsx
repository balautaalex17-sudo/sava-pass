import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ImageIcon, Images, Pin, Sparkles, UploadCloud } from "lucide-react";

import { StaffHeader } from "@/components/staff/StaffHeader";
import { rankMedia } from "@/lib/media-selection";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MediaAsset } from "@/lib/supabase/types";
import {
  AutoPlacementForm,
  ManualPlacementForm,
  MediaAssetEditor,
  MediaUploadForm,
} from "./MediaForms";
import { MEDIA_CATEGORIES, MEDIA_ORIENTATIONS, sourceLabel } from "./media-options";

export const metadata: Metadata = { title: "Biblioteca media — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function MediaLibraryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const query = await searchParams;
  const categoryCandidate = one(query.category, "Hero");
  const orientationCandidate = one(query.orientation, "landscape");
  const category = MEDIA_CATEGORIES.includes(categoryCandidate as (typeof MEDIA_CATEGORIES)[number]) ? categoryCandidate : "Hero";
  const orientation = MEDIA_ORIENTATIONS.includes(orientationCandidate as (typeof MEDIA_ORIENTATIONS)[number]) ? orientationCandidate : "landscape";
  const context = {
    pageType: one(query.page_type, "landing"),
    slot: one(query.slot, "hero"),
    targetId: one(query.target_id, ""),
    category,
    orientation,
    tags: one(query.tags, "community, group, event"),
    mood: one(query.mood, "documentar"),
    preferFaces: query.prefer_faces === "on",
    needsSafeCrop: query.needs_safe_crop !== "off",
  };

  const [{ data: rawAssets }, { data: placements }] = await Promise.all([
    supabaseAdmin.from("media_assets").select("*").order("archived").order("created_at", { ascending: false }),
    supabaseAdmin.from("media_placements").select("*").order("updated_at", { ascending: false }),
  ]);
  const assets = (rawAssets ?? []) as MediaAsset[];
  const placement = (placements ?? []).find((item) => item.page_type === context.pageType && item.slot === context.slot && (item.target_id ?? "") === context.targetId);
  const blocked = new Set(placement?.excluded_asset_ids ?? []);
  const usageCount: Record<string, number> = {};
  for (const item of placements ?? []) {
    if (item.selected_asset_id) usageCount[item.selected_asset_id] = (usageCount[item.selected_asset_id] ?? 0) + 1;
  }
  const recommendations = rankMedia(
    assets.filter((asset) => !blocked.has(asset.id)),
    {
      category,
      orientation,
      tags: context.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      mood: context.mood,
      preferFaces: context.preferFaces,
      needsSafeCrop: context.needsSafeCrop,
    },
    usageCount,
  ).slice(0, 4);
  const selectedId = placement?.pinned_asset_id ?? placement?.selected_asset_id ?? recommendations[0]?.asset.id;
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const bestRecommendation = recommendations[0];
  const selectionReason = placement?.selection_reason
    ?? (bestRecommendation ? `Scor ${bestRecommendation.score}: ${bestRecommendation.reasons.join(", ")}.` : "Nicio justificare disponibilă.");
  const visibleAssets = assets.filter((asset) => query.show_archived === "on" || !asset.archived);
  const authenticCount = assets.filter((asset) => asset.source_kind === "real_photo" || asset.source_kind === "edited_photo").length;
  const excludedCount = assets.filter((asset) => asset.excluded).length;

  return <>
    <MediaStyles />
    <StaffHeader
      left={<Link href="/admin" className="media-back"><ArrowLeft size={16} /> Admin</Link>}
      center={<strong className="media-header-title">Biblioteca media</strong>}
    />
    <main className="media-shell">
      <header className="media-hero-admin">
        <div><span>Media operations</span><h1>Imagini alese cu motiv, nu la întâmplare.</h1><p>Încarcă, clasifică și verifică separat cropul desktop și mobil. Recomandările folosesc doar metadatele salvate, fără apeluri AI în timpul afișării paginii.</p></div>
        <div className="media-stats"><Stat value={assets.length} label="asseturi" icon={<Images />} /><Stat value={authenticCount} label="fotografii autentice" icon={<CheckCircle2 />} /><Stat value={excludedCount} label="excluse" icon={<ImageIcon />} /></div>
      </header>

      <section className="media-panel">
        <div className="media-section-head"><div><span>Import</span><h2>Adaugă fotografii sau video</h2></div><UploadCloud /></div>
        <MediaUploadForm />
      </section>

      <section className="media-recommendation">
        <div className="media-section-head"><div><span>Selecție asistată</span><h2>Recomandare pentru un loc din site</h2></div><Sparkles /></div>
        <form method="get" action="/admin/media" className="media-context-form">
          <label className="media-field"><span>Tip pagină</span><input name="page_type" defaultValue={context.pageType} /></label>
          <label className="media-field"><span>Loc vizual</span><input name="slot" defaultValue={context.slot} /></label>
          <label className="media-field"><span>Categorie</span><select name="category" defaultValue={category}>{MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="media-field"><span>Orientare</span><select name="orientation" defaultValue={orientation}>{MEDIA_ORIENTATIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="media-field"><span>Taguri căutate</span><input name="tags" defaultValue={context.tags} /></label>
          <label className="media-field"><span>Stare vizuală</span><input name="mood" defaultValue={context.mood} /></label>
          <label className="media-check"><input type="checkbox" name="prefer_faces" defaultChecked={context.preferFaces} /><span>Preferă fețe vizibile</span></label>
          <label className="media-check"><input type="checkbox" name="needs_safe_crop" value="on" defaultChecked={context.needsSafeCrop} /><span>Crop sigur obligatoriu</span></label>
          <button className="media-secondary pressable" type="submit">Actualizează previzualizarea</button>
        </form>

        <div className="media-selection-grid">
          <div className="media-current">
            <span className="media-kicker">Selecția curentă</span>
            {selected ? <>
              <div className="media-current-image"><Image src={selected.public_url} alt={selected.alt_text} fill sizes="(max-width: 820px) 100vw, 560px" style={{ objectFit: "cover", objectPosition: `${Number(selected.focal_x) * 100}% ${Number(selected.focal_y) * 100}%` }} /></div>
              <div className="media-current-copy"><div><b>{selected.file_name}</b><small>{sourceLabel(selected.source_kind)} · {selected.category}</small></div>{placement?.pinned_asset_id ? <em><Pin size={12} /> Fixată</em> : null}</div>
              <p>{selectionReason}</p>
            </> : <div className="media-empty">Nu există un asset eligibil.</div>}
            <AutoPlacementForm context={context} />
            <ManualPlacementForm context={context} assets={assets.filter((asset) => !asset.archived && !asset.excluded)} selectedId={selectedId} autoSelect={placement?.auto_select ?? true} />
          </div>

          <div className="media-alternatives">
            <span className="media-kicker">Alternative explicate</span>
            {recommendations.map((item, index) => <article key={item.asset.id}>
              <div className="media-alt-image"><Image src={item.asset.public_url} alt={item.asset.alt_text} fill sizes="180px" style={{ objectFit: "cover", objectPosition: `${Number(item.asset.focal_x) * 100}% ${Number(item.asset.focal_y) * 100}%` }} /></div>
              <div><span>#{index + 1} · scor {item.score}</span><b>{item.asset.file_name}</b><p>{item.reasons.slice(0, 4).join(" · ")}</p></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="media-library">
        <div className="media-section-head"><div><span>Inventar</span><h2>{visibleAssets.length} asseturi disponibile</h2></div><form method="get" action="/admin/media"><input type="hidden" name="show_archived" value="on" /><button className="media-secondary pressable" type="submit">Arată și arhivate</button></form></div>
        <div className="media-library-grid">{visibleAssets.map((asset) => <MediaAssetEditor key={asset.id} asset={asset} />)}</div>
      </section>
    </main>
  </>;
}

function Stat({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return <div><span>{icon}</span><b>{value}</b><small>{label}</small></div>;
}

function MediaStyles() {
  return <style>{`
    .media-back{display:inline-flex;align-items:center;gap:7px;color:var(--im-fg-2);text-decoration:none;font-size:13px;font-weight:750}.media-header-title{color:var(--im-fg);font-size:13px}.media-shell{max-width:1240px;margin:0 auto;padding:32px 22px 88px}.media-hero-admin{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:40px;margin-bottom:24px}.media-hero-admin>div:first-child>span,.media-section-head>div>span,.media-kicker{font:700 10px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--im-cyan-light)}.media-hero-admin h1{max-width:720px;margin:8px 0 8px;color:var(--im-fg);font-size:clamp(29px,4vw,46px);line-height:1;letter-spacing:-.045em}.media-hero-admin p{max-width:700px;margin:0;color:var(--im-fg-2);font-size:13px;line-height:1.65}.media-stats{display:flex;gap:8px}.media-stats>div{min-width:112px;padding:13px;border-radius:14px;background:var(--im-ink-2);border:1px solid var(--im-line);display:grid;grid-template-columns:28px 1fr;align-items:center}.media-stats>div>span{grid-row:span 2;color:var(--im-cyan-light)}.media-stats svg{width:17px}.media-stats b{font-size:20px;color:var(--im-fg)}.media-stats small{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--im-fg-3)}.media-panel,.media-recommendation,.media-library{padding:20px;border:1px solid var(--im-line);border-radius:20px;background:var(--im-ink-2);margin-bottom:18px}.media-section-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:17px}.media-section-head h2{margin:5px 0 0;color:var(--im-fg);font-size:19px}.media-section-head>svg{color:var(--im-cyan-light)}.media-upload,.media-context-form,.media-meta-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.media-field{display:grid;gap:5px}.media-field--wide{grid-column:1/-1}.media-field>span,.media-field>label,.media-upload>div>label,.media-folder-import .media-field>span{font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.075em;color:var(--im-fg-3)}.media-field input,.media-field select,.media-upload input,.media-upload select{min-width:0;width:100%;border:1px solid var(--im-line);border-radius:9px;padding:10px;background:var(--im-ink-3);color:var(--im-fg);font:inherit;font-size:11px}.media-field input[type=file],.media-upload input[type=file]{padding:8px}.media-upload small{font-size:9px;color:var(--im-fg-3)}.media-folder-import{border:1px dashed var(--im-line);border-radius:10px;padding:9px}.media-folder-import summary{display:flex;align-items:center;gap:7px;color:var(--im-fg-2);font-size:11px;font-weight:700;cursor:pointer}.media-folder-import[open] summary{margin-bottom:9px}.media-check{display:inline-flex;align-items:center;gap:7px;color:var(--im-fg-2);font-size:10px;font-weight:650}.media-check input{width:15px;height:15px;accent-color:var(--im-cyan)}.media-check span{display:inline-flex;align-items:center;gap:5px}.media-primary,.media-secondary,.media-danger{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:9px;padding:10px 13px;font-size:10px;font-weight:800;cursor:pointer}.media-primary{background:var(--im-grad);color:#fff}.media-secondary{border:1px solid var(--im-line);background:var(--im-ink-3);color:var(--im-fg)}.media-danger{background:rgba(220,38,38,.12);color:#fca5a5}.media-primary:disabled,.media-secondary:disabled,.media-danger:disabled{opacity:.55;cursor:wait}.media-form-foot{display:flex;align-items:center;justify-content:flex-end;gap:12px}.media-action-state{min-height:14px;margin:0 auto 0 0;font-size:10px;color:#86efac}.media-action-state.is-error{color:#fca5a5}.media-context-form{padding:14px;border-radius:14px;background:var(--im-ink-3);margin-bottom:14px}.media-context-form>.media-secondary{align-self:end}.media-selection-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(330px,.9fr);gap:14px}.media-current,.media-alternatives{padding:15px;border:1px solid var(--im-line-soft);border-radius:15px;background:var(--im-ink-3)}.media-current-image{position:relative;aspect-ratio:16/7;margin-top:10px;border-radius:12px;overflow:hidden;background:#101720}.media-current-copy{display:flex;justify-content:space-between;align-items:start;gap:10px;margin-top:10px}.media-current-copy>div{display:grid}.media-current-copy b{font-size:12px;color:var(--im-fg)}.media-current-copy small{font-size:9px;color:var(--im-fg-3)}.media-current-copy em{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:9px;color:#fde68a}.media-current>p{font-size:10px;color:var(--im-fg-2);line-height:1.55}.media-placement-action{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.media-manual-form{display:grid;grid-template-columns:1fr auto;align-items:end;gap:9px;margin-top:12px;padding-top:12px;border-top:1px solid var(--im-line)}.media-manual-form>.media-action-state{grid-column:1/-1}.media-manual-form>.media-check{grid-column:1/-1}.media-alternatives{display:grid;align-content:start;gap:9px}.media-alternatives>article{display:grid;grid-template-columns:94px 1fr;gap:10px;padding:8px;border:1px solid var(--im-line-soft);border-radius:11px}.media-alt-image{position:relative;min-height:76px;border-radius:8px;overflow:hidden;background:#101720}.media-alternatives article>div:last-child{display:grid;align-content:center}.media-alternatives article span{font:700 8px/1.2 var(--font-mono);color:var(--im-cyan-light);text-transform:uppercase}.media-alternatives article b{margin-top:4px;font-size:10px;color:var(--im-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.media-alternatives article p{margin:4px 0 0;font-size:8px;line-height:1.45;color:var(--im-fg-3)}.media-library-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.media-card{overflow:hidden;border:1px solid var(--im-line);border-radius:14px;background:var(--im-ink-3)}.media-card.is-excluded{outline:1px solid rgba(245,158,11,.5);opacity:.78}.media-card.is-archived{opacity:.58}.media-card-preview{position:relative;aspect-ratio:4/3;background:#0c121b}.media-card-preview video{width:100%;height:100%;object-fit:cover}.media-source,.media-resolution{position:absolute;z-index:2;top:8px;padding:4px 7px;border-radius:6px;background:rgba(5,10,18,.82);backdrop-filter:blur(5px);font-size:8px;font-weight:750;color:#fff}.media-source{left:8px}.media-resolution{right:8px}.media-source--real_photo{background:rgba(22,101,52,.9)}.media-source--edited_photo{background:rgba(3,105,161,.9)}.media-source--higgsfield{background:rgba(109,40,217,.9)}.media-card details>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px;cursor:pointer;color:var(--im-cyan-light);font-size:9px}.media-card details>summary>span:first-child{min-width:0;display:grid}.media-card details>summary b{color:var(--im-fg);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.media-card details>summary small{color:var(--im-fg-3);font-size:8px}.media-meta-form{grid-template-columns:1fr 1fr;padding:11px;border-top:1px solid var(--im-line)}.media-crop-lab{padding:9px;border:1px solid var(--im-line-soft);border-radius:10px}.media-crop-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.media-crop-row label{display:grid;gap:4px;color:var(--im-fg-3);font-size:8px}.media-crop-row input{width:100%;accent-color:var(--im-cyan)}.media-crop-previews{display:grid;grid-template-columns:1fr 110px;align-items:end;gap:8px;margin-top:8px}.media-crop-previews figure{position:relative;margin:0;overflow:hidden;border-radius:7px;background:#101720}.media-crop-previews figcaption{position:absolute;left:5px;bottom:5px;padding:3px 5px;border-radius:4px;background:rgba(5,10,18,.78);color:#fff;font-size:7px}.media-archive-form{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:0 11px 11px}.media-empty{display:grid;place-items:center;min-height:180px;border:1px dashed var(--im-line);border-radius:12px;color:var(--im-fg-3);font-size:11px}@media(max-width:1000px){.media-hero-admin{grid-template-columns:1fr}.media-stats{justify-content:flex-start}.media-upload,.media-context-form{grid-template-columns:repeat(2,minmax(0,1fr))}.media-library-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.media-shell{padding-inline:14px}.media-stats{flex-wrap:wrap}.media-stats>div{min-width:0;flex:1 1 120px}.media-field input,.media-field select,.media-upload input,.media-upload select{min-height:44px;font-size:16px}.media-primary,.media-secondary,.media-danger,.media-folder-import summary,.media-card details>summary{min-height:44px}.media-selection-grid{grid-template-columns:1fr}.media-library-grid{grid-template-columns:1fr}.media-current-image{aspect-ratio:16/9}}@media(max-width:520px){.media-upload,.media-context-form{grid-template-columns:1fr}.media-meta-form{grid-template-columns:1fr 1fr}.media-panel,.media-recommendation,.media-library{padding:13px}.media-form-foot{align-items:stretch;flex-direction:column}.media-form-foot button{width:100%}}
  `}</style>;
}
