import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import type { CaseView, PresentationView } from "@vakamatik/desktop-contract";
import type { ImageAdjustment } from "@vakamatik/domain";

type Slide = PresentationView["slides"][number];
type Layer = Slide["imageLayers"][number];

export function AlignmentControls({
  caseView,
  slide,
  onCaseChange,
}: {
  readonly caseView: CaseView;
  readonly slide: Slide;
  readonly onCaseChange: (next: CaseView) => void;
}): ReactNode {
  const [selectedInstanceId, setSelectedInstanceId] = useState(slide.imageLayers[0]?.instanceId ?? "");
  const selected =
    slide.imageLayers.find((layer) => layer.instanceId === selectedInstanceId) ?? slide.imageLayers[0];
  const [draft, setDraft] = useState<ImageAdjustment | null>(selected?.transform ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const next =
      slide.imageLayers.find((layer) => layer.instanceId === selectedInstanceId) ?? slide.imageLayers[0];
    setSelectedInstanceId(next?.instanceId ?? "");
    setDraft(next?.transform ?? null);
  }, [slide.semanticSlideId, slide.previewDataUrl]);

  if (selected === undefined || draft === null)
    return (
      <section className="alignment-panel">
        <h3>Görüntü hizalama</h3>
        <p>Bu slaytta hizalanabilir görüntü yok.</p>
      </section>
    );

  const persist = async (
    layer: Layer,
    transform: ImageAdjustment,
    linkGroup: string | null,
  ): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const alignment = {
        ...caseView.alignment,
        groups:
          linkGroup === null
            ? caseView.alignment.groups
            : { ...caseView.alignment.groups, [linkGroup]: transform },
        instances: { ...caseView.alignment.instances, [layer.instanceId]: { linkGroup, transform } },
      };
      const saved = await window.vakamatik.saveCaseAlignment({
        caseId: caseView.caseId,
        revision: caseView.revision,
        alignment,
      });
      onCaseChange(saved);
      setMessage("Hizalama kaydedildi.");
    } catch {
      setMessage("Hizalama kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const move = (x: number, y: number): void =>
    setDraft({
      ...draft,
      translationXPt: draft.translationXPt + x,
      translationYPt: draft.translationYPt + y,
    });
  const keyMove = (event: KeyboardEvent<HTMLElement>): void => {
    if ((event.target as HTMLElement).matches("input, textarea, select")) return;
    const step = event.shiftKey ? 5 : event.altKey ? 0.05 : 0.5;
    if (event.key === "ArrowLeft") move(-step, 0);
    else if (event.key === "ArrowRight") move(step, 0);
    else if (event.key === "ArrowUp") move(0, -step);
    else if (event.key === "ArrowDown") move(0, step);
    else return;
    event.preventDefault();
  };

  const numberField = (
    label: string,
    key: "translationXPt" | "translationYPt" | "uniformScale" | "rotationDeg" | "opacity",
    step: number,
    min?: number,
    max?: number,
  ): ReactNode => (
    <label>
      <span>{label}</span>
      <input
        max={max}
        min={min}
        step={step}
        type="number"
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })}
      />
    </label>
  );

  return (
    <section className="alignment-panel" onKeyDown={keyMove} tabIndex={0}>
      <div className="alignment-heading">
        <div>
          <h3>Görüntü hizalama</h3>
          <p>Oklar 0,5 pt (bir 1440×1080 referans pikseli); Shift 5 pt, Alt 0,05 pt.</p>
        </div>
        <span>{selected.linkGroup === null ? "Bağımsız" : `Bağlı · ${selected.linkGroup}`}</span>
      </div>
      <label className="layer-select">
        <span>Görüntü katmanı</span>
        <select
          value={selected.instanceId}
          onChange={(event) => {
            const layer = slide.imageLayers.find((item) => item.instanceId === event.target.value);
            setSelectedInstanceId(event.target.value);
            setDraft(layer?.transform ?? null);
          }}
        >
          {slide.imageLayers.map((layer) => (
            <option key={layer.instanceId} value={layer.instanceId}>
              {layer.assetKey}
            </option>
          ))}
        </select>
      </label>
      <div className="nudge-grid">
        <span />
        <button onClick={() => move(0, -0.5)} type="button">
          ↑
        </button>
        <span />
        <button onClick={() => move(-0.5, 0)} type="button">
          ←
        </button>
        <button onClick={() => move(0, 0.5)} type="button">
          ↓
        </button>
        <button onClick={() => move(0.5, 0)} type="button">
          →
        </button>
      </div>
      <div className="alignment-fields">
        {numberField("X (pt)", "translationXPt", 0.5, -720, 720)}
        {numberField("Y (pt)", "translationYPt", 0.5, -540, 540)}
        {numberField("Ölçek", "uniformScale", 0.01, 0.1, 8)}
        {numberField("Dönüş (°)", "rotationDeg", 0.1, -360, 360)}
        {numberField("Opaklık", "opacity", 0.01, 0, 1)}
      </div>
      <fieldset className="crop-fields">
        <legend>Kırpma oranı</legend>
        {(
          [
            ["left", "Sol"],
            ["top", "Üst"],
            ["right", "Sağ"],
            ["bottom", "Alt"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              max="0.95"
              min="0"
              step="0.01"
              type="number"
              value={draft.crop[key]}
              onChange={(event) =>
                setDraft({ ...draft, crop: { ...draft.crop, [key]: Number(event.target.value) } })
              }
            />
          </label>
        ))}
      </fieldset>
      <div className="alignment-actions">
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void persist(selected, draft, selected.linkGroup)}
          type="button"
        >
          Uygula ve kaydet
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setDraft(selected.defaultTransform);
            void persist(selected, selected.defaultTransform, selected.linkGroup);
          }}
          type="button"
        >
          Sıfırla
        </button>
        {selected.linkGroup === null && selected.availableLinkGroup !== null ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void persist(selected, draft, selected.availableLinkGroup)}
            type="button"
          >
            Ortak sefe bağla
          </button>
        ) : selected.linkGroup !== null ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void persist(selected, draft, null)}
            type="button"
          >
            Bu örneği ayır
          </button>
        ) : null}
      </div>
      {message === null ? null : (
        <p className="alignment-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
