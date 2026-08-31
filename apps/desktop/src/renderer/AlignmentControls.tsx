import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CaseView, PresentationView } from "@vakamatik/desktop-contract";
import type { ImageAdjustment } from "@vakamatik/domain";
import {
  consumeAlignmentArrow,
  setCropEdgePosition,
  shiftCropWindow,
  zoomCropWindow,
} from "./alignment-keyboard.js";
import type { SaveStatus } from "./workspace-save.js";

type Slide = PresentationView["slides"][number];
type KeyboardMode = "placement" | "crop";

export interface AlignmentControlsHandle {
  readonly setRotationDeg: (rotationDeg: number) => void;
  readonly flush: () => Promise<{ readonly caseView: CaseView; readonly ok: boolean }>;
}

interface AlignmentControlsProps {
  readonly caseView: CaseView;
  readonly slide: Slide;
  readonly selectedInstanceId: string | null;
  readonly onCaseChange: (next: CaseView) => void;
  readonly onSaveStatusChange: (status: SaveStatus) => void;
  readonly onSelect: (instanceId: string) => void;
  readonly onSlidePreview: (slide: Slide) => void;
  readonly onDraftTransformChange: (transform: ImageAdjustment | null) => void;
}

function ArrowIcon({ direction }: { readonly direction: "up" | "down" | "left" | "right" }): ReactNode {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M10 16V4M5.5 8.5 10 4l4.5 4.5" />
    </svg>
  );
}

function DirectionPad({
  label,
  onNudge,
}: {
  readonly label: string;
  readonly onNudge: (x: number, y: number) => void;
}): ReactNode {
  return (
    <div className="direction-pad" aria-label={label}>
      <span />
      <button aria-label={`${label}: yukarı`} onClick={() => onNudge(0, -1)} type="button">
        <ArrowIcon direction="up" />
      </button>
      <span />
      <button aria-label={`${label}: sola`} onClick={() => onNudge(-1, 0)} type="button">
        <ArrowIcon direction="left" />
      </button>
      <span className="direction-pad-center" />
      <button aria-label={`${label}: sağa`} onClick={() => onNudge(1, 0)} type="button">
        <ArrowIcon direction="right" />
      </button>
      <span />
      <button aria-label={`${label}: aşağı`} onClick={() => onNudge(0, 1)} type="button">
        <ArrowIcon direction="down" />
      </button>
      <span />
    </div>
  );
}

export const AlignmentControls = forwardRef<AlignmentControlsHandle, AlignmentControlsProps>(
  function AlignmentControls(props, ref): ReactNode {
    const {
      caseView,
      slide,
      selectedInstanceId,
      onCaseChange,
      onSaveStatusChange,
      onSelect,
      onSlidePreview,
      onDraftTransformChange,
    } = props;
    const selected =
      slide.imageLayers.find((layer) => layer.instanceId === selectedInstanceId) ?? slide.imageLayers[0];
    const [draft, setDraft] = useState<ImageAdjustment | null>(selected?.transform ?? null);
    const [draftLinkGroup, setDraftLinkGroup] = useState<string | null>(selected?.linkGroup ?? null);
    const [dirty, setDirty] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("placement");
    const previewSequence = useRef(0);
    const previewFrame = useRef<number | null>(null);
    const flushPromise = useRef<Promise<{ readonly caseView: CaseView; readonly ok: boolean }> | null>(null);
    const dirtyRef = useRef(false);
    const draftRef = useRef<ImageAdjustment | null>(selected?.transform ?? null);
    const linkGroupRef = useRef<string | null>(selected?.linkGroup ?? null);

    const buildAlignment = useCallback(
      (currentDraft: ImageAdjustment, currentLinkGroup: string | null) => ({
        ...caseView.alignment,
        groups:
          currentLinkGroup === null
            ? caseView.alignment.groups
            : { ...caseView.alignment.groups, [currentLinkGroup]: currentDraft },
        instances:
          selected === undefined
            ? caseView.alignment.instances
            : {
                ...caseView.alignment.instances,
                [selected.instanceId]: { linkGroup: currentLinkGroup, transform: currentDraft },
              },
      }),
      [caseView.alignment, selected?.instanceId],
    );

    const updateDraft = useCallback(
      (update: ImageAdjustment | ((current: ImageAdjustment) => ImageAdjustment)): void => {
        const current = draftRef.current;
        if (current === null) return;
        const next = typeof update === "function" ? update(current) : update;
        draftRef.current = next;
        setDraft(next);
        onDraftTransformChange(next);
        setDirty(true);
        dirtyRef.current = true;
        setMessage(null);
        onSaveStatusChange("pending");
      },
      [onDraftTransformChange, onSaveStatusChange],
    );

    const flush = useCallback(async (): Promise<{ readonly caseView: CaseView; readonly ok: boolean }> => {
      if (!dirtyRef.current || selected === undefined || draftRef.current === null)
        return { caseView, ok: true };
      if (flushPromise.current !== null) return flushPromise.current;
      const alignment = buildAlignment(draftRef.current, linkGroupRef.current);
      onSaveStatusChange("saving");
      const pending = window.vakamatik
        .saveCaseAlignment({ caseId: caseView.caseId, revision: caseView.revision, alignment })
        .then((saved) => {
          onCaseChange(saved);
          onSaveStatusChange("saved");
          setDirty(false);
          dirtyRef.current = false;
          setMessage("Hizalama kaydedildi.");
          return { caseView: saved, ok: true } as const;
        })
        .catch(() => {
          onSaveStatusChange("error");
          setMessage("Hizalama kaydedilemedi. Değişiklikleri kontrol edip yeniden deneyin.");
          return { caseView, ok: false } as const;
        })
        .finally(() => {
          flushPromise.current = null;
        });
      flushPromise.current = pending;
      return pending;
    }, [buildAlignment, caseView, onCaseChange, onSaveStatusChange, selected?.instanceId]);

    useImperativeHandle(
      ref,
      () => ({
        setRotationDeg: (rotationDeg: number) => {
          setKeyboardMode("placement");
          updateDraft((current) => ({ ...current, rotationDeg }));
        },
        flush,
      }),
      [flush, updateDraft],
    );

    useEffect(() => {
      const next = selected?.transform ?? null;
      setDraft(next);
      draftRef.current = next;
      setDraftLinkGroup(selected?.linkGroup ?? null);
      linkGroupRef.current = selected?.linkGroup ?? null;
      setDirty(false);
      dirtyRef.current = false;
      onDraftTransformChange(next);
    }, [slide.semanticSlideId, selected?.instanceId, caseView.caseId]);

    useEffect(() => {
      if (!dirty || selected === undefined || draft === null) return;
      const alignment = buildAlignment(draft, draftLinkGroup);
      const sequence = ++previewSequence.current;
      if (previewFrame.current !== null) window.cancelAnimationFrame(previewFrame.current);
      previewFrame.current = window.requestAnimationFrame(() => {
        previewFrame.current = null;
        void window.vakamatik
          .previewPresentationSlide({
            caseId: caseView.caseId,
            revision: caseView.revision,
            semanticSlideId: slide.semanticSlideId,
            alignment,
          })
          .then((nextSlide) => {
            if (sequence === previewSequence.current) onSlidePreview(nextSlide);
          })
          .catch(() => setMessage("Canlı önizleme güncellenemedi; son geçerli görüntü korunuyor."));
      });
      return () => {
        if (previewFrame.current !== null) window.cancelAnimationFrame(previewFrame.current);
      };
    }, [buildAlignment, dirty, draft, draftLinkGroup, selected?.instanceId]);

    useEffect(() => {
      if (selected === undefined || draft === null) return;
      const handleArrow = (event: globalThis.KeyboardEvent): void => {
        const editableTarget =
          event.target instanceof HTMLElement &&
          event.target.matches("input, textarea, select, [contenteditable='true']");
        const nudge = consumeAlignmentArrow(event, editableTarget);
        if (nudge === null) return;
        if (keyboardMode === "placement") {
          updateDraft((current) => ({
            ...current,
            translationXPt: current.translationXPt + nudge.xPt,
            translationYPt: current.translationYPt + nudge.yPt,
          }));
        } else {
          updateDraft((current) => ({
            ...current,
            crop: shiftCropWindow(current.crop, nudge.xPt * 0.01, nudge.yPt * 0.01),
          }));
        }
      };
      window.addEventListener("keydown", handleArrow, { capture: true });
      return () => window.removeEventListener("keydown", handleArrow, { capture: true });
    }, [selected?.instanceId, draft === null, keyboardMode, updateDraft]);

    if (selected === undefined || draft === null)
      return (
        <section className="alignment-panel empty">
          <h3>Görüntü hizalama</h3>
          <p>Önizlemede düzenlemek istediğiniz görüntüyü seçin.</p>
        </section>
      );

    const numberField = (
      label: string,
      key: "translationXPt" | "translationYPt" | "uniformScale" | "rotationDeg" | "opacity",
      step: number,
      mode: KeyboardMode,
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
          onChange={(event) => {
            setKeyboardMode(mode);
            updateDraft({ ...draft, [key]: Number(event.target.value) });
          }}
        />
      </label>
    );

    return (
      <section className="alignment-panel" tabIndex={0}>
        <div className="alignment-heading">
          <div>
            <h3>{selected.label}</h3>
            <p>
              Ok tuşları son düzenlenen {keyboardMode === "placement" ? "yerleşim" : "kırpma"} bölümünü
              kontrol eder. Shift 5 pt, Alt 0,05 pt.
            </p>
          </div>
          <span>{draftLinkGroup === null ? "Bağımsız" : "Bağlı"}</span>
        </div>
        <label className="layer-select">
          <span>Görüntü katmanı</span>
          <select value={selected.instanceId} onChange={(event) => onSelect(event.target.value)}>
            {slide.imageLayers.map((layer) => (
              <option key={layer.instanceId} value={layer.instanceId}>
                {layer.label}
              </option>
            ))}
          </select>
        </label>
        <section className="alignment-section">
          <div className="alignment-section-heading">
            <div>
              <h4>Yerleşim</h4>
              <p>Görüntünün tamamını slaytta hareket ettirin.</p>
            </div>
          </div>
          <div className="alignment-section-body">
            <DirectionPad
              label="Görüntüyü taşı"
              onNudge={(x, y) => {
                setKeyboardMode("placement");
                updateDraft((current) => ({
                  ...current,
                  translationXPt: current.translationXPt + x * 0.5,
                  translationYPt: current.translationYPt + y * 0.5,
                }));
              }}
            />
            <div className="alignment-fields placement-fields">
              {numberField("X (pt)", "translationXPt", 0.5, "placement", -720, 720)}
              {numberField("Y (pt)", "translationYPt", 0.5, "placement", -540, 540)}
            </div>
          </div>
        </section>
        <section className="alignment-section">
          <div className="alignment-section-heading">
            <div>
              <h4>Boyut ve dönüş</h4>
              <p>Ölçek, açı ve katman görünürlüğü.</p>
            </div>
          </div>
          <div className="alignment-fields visual-fields">
            {numberField("Ölçek", "uniformScale", 0.01, "placement", 0.1, 8)}
            {numberField("Dönüş (°)", "rotationDeg", 0.1, "placement", -360, 360)}
            {numberField("Opaklık", "opacity", 0.01, "placement", 0, 1)}
          </div>
        </section>
        <section className="alignment-section">
          <div className="alignment-section-heading">
            <div>
              <h4>Kırpma</h4>
              <p>Görüntüyü çerçeve içinde kaydırın; hareket görüntü sınırında durur.</p>
            </div>
          </div>
          <div className="alignment-section-body">
            <DirectionPad
              label="Kırpma penceresini taşı"
              onNudge={(x, y) => {
                setKeyboardMode("crop");
                updateDraft((current) => ({
                  ...current,
                  crop: shiftCropWindow(current.crop, x * 0.005, y * 0.005),
                }));
              }}
            />
            <fieldset className="crop-fields">
              <legend>Kırpma konumu</legend>
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
                    max={
                      key === "left" || key === "right"
                        ? draft.crop.left + draft.crop.right
                        : draft.crop.top + draft.crop.bottom
                    }
                    min="0"
                    step="0.01"
                    type="number"
                    value={draft.crop[key]}
                    onChange={(event) => {
                      setKeyboardMode("crop");
                      updateDraft({
                        ...draft,
                        crop: setCropEdgePosition(draft.crop, key, Number(event.target.value)),
                      });
                    }}
                  />
                </label>
              ))}
              <small>Bir kenarı değiştirince karşı kenar otomatik dengelenir; görüntü büyümez.</small>
            </fieldset>
          </div>
          <div className="crop-zoom-control">
            <div>
              <strong>Yakınlaştır ve doldur</strong>
              <span>Oklar yalnızca görüntüyü kaydırır ve görüntü sınırında durur.</span>
            </div>
            <div className="crop-zoom-actions" aria-label="Kırpma yakınlaştırması">
              <button
                className="button secondary"
                onClick={() => {
                  setKeyboardMode("crop");
                  updateDraft((current) => ({ ...current, crop: zoomCropWindow(current.crop, -0.05) }));
                }}
                type="button"
              >
                Uzaklaştır
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setKeyboardMode("crop");
                  updateDraft((current) => ({ ...current, crop: zoomCropWindow(current.crop, 0.05) }));
                }}
                type="button"
              >
                Yakınlaştır
              </button>
            </div>
          </div>
        </section>
        <div className="alignment-actions">
          <button
            className="button secondary"
            onClick={() => updateDraft(selected.defaultTransform)}
            type="button"
          >
            Sıfırla
          </button>
          {draftLinkGroup === null && selected.availableLinkGroup !== null ? (
            <button
              className="button secondary"
              onClick={() => {
                setDraftLinkGroup(selected.availableLinkGroup);
                linkGroupRef.current = selected.availableLinkGroup;
                setDirty(true);
                dirtyRef.current = true;
                onSaveStatusChange("pending");
              }}
              type="button"
            >
              Ortak sete bağla
            </button>
          ) : draftLinkGroup !== null ? (
            <button
              className="button secondary"
              onClick={() => {
                setDraftLinkGroup(null);
                linkGroupRef.current = null;
                setDirty(true);
                dirtyRef.current = true;
                onSaveStatusChange("pending");
              }}
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
  },
);
