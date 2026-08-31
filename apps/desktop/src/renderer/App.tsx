import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { RECORD_SLOTS, type ImageAdjustment, type RecordSlotId } from "@vakamatik/domain";
import {
  defaultWorkspaceUiState,
  type CaseSessionSummary,
  type CaseView,
  type PresentationView,
  type ShellAppInfo,
  type WorkspaceTab,
  type WorkspaceUiState,
} from "@vakamatik/desktop-contract";
import { ClinicalPage } from "./ClinicalPage.js";
import { AlignmentControls, type AlignmentControlsHandle } from "./AlignmentControls.js";
import { hitTestImageLayers } from "./presentation-hit-test.js";
import { rotationFromPointerDrag } from "./alignment-keyboard.js";
import { warningDisplayCopy } from "./warning-copy.js";
import { flushBeforeTransition, type RegisterFlush, type SaveStatus } from "./workspace-save.js";

type RecordGroup = (typeof RECORD_SLOTS)[number]["group"];
type Filter = "all" | RecordGroup;
type BusyAction = "create" | "open" | "save" | "close" | "import" | "repair" | null;

const GROUP_LABELS: Readonly<Record<RecordGroup, string>> = {
  extraoral: "Ekstraoral",
  intraoral: "İntraoral",
  models: "Modeller",
  inferior: "İnferior kayıtlar",
  imaging: "Görüntüleme",
  optional: "Opsiyonel slaytlar",
};

function BrandMark(): ReactNode {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 40 40">
      <path d="M8 8h24v24H8z" />
      <path d="M14 20h12M20 14v12" />
    </svg>
  );
}

function Navigation({ onNavigate }: { readonly onNavigate: (path: string) => Promise<void> }): ReactNode {
  const items = [
    { to: "/", label: "Sunum oluşturma", end: true },
    { to: "/system", label: "Sistem durumu", end: false },
    { to: "/about", label: "Hakkında", end: false },
  ] as const;

  return (
    <nav aria-label="Ana gezinme" className="navigation">
      {items.map((item) => (
        <NavLink
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          end={item.end}
          key={item.to}
          onClick={(event) => {
            event.preventDefault();
            void onNavigate(item.to);
          }}
          to={item.to}
        >
          <span className="nav-marker" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function EmptyCaseWorkspace({
  busy,
  error,
  sessions,
  onActivate,
  onCreate,
  onForget,
  onOpen,
  onRepairAsset,
  onRelink,
  repairCaseId,
}: {
  readonly busy: BusyAction;
  readonly error: string | null;
  readonly sessions: readonly CaseSessionSummary[];
  readonly onActivate: (caseId: string) => Promise<void>;
  readonly onCreate: (title: string) => Promise<void>;
  readonly onForget: (caseId: string) => Promise<void>;
  readonly onOpen: () => Promise<void>;
  readonly onRepairAsset: (caseId: string) => Promise<void>;
  readonly onRelink: (caseId: string) => Promise<void>;
  readonly repairCaseId: string | null;
}): ReactNode {
  const [title, setTitle] = useState("Yeni ortodontik vaka");

  const handleCreate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onCreate(title);
  };

  return (
    <section className="empty-workspace">
      <div className="empty-copy">
        <h1>Sunum oturumunuza devam edin.</h1>
        <p>
          Son çalıştığınız vaka sunumları burada kalır. Bir oturumu açın, yeni vaka oluşturun veya mevcut vaka
          klasörünü ekleyin.
        </p>
      </div>
      {sessions.length === 0 ? (
        <div className="session-empty">
          <strong>Henüz kayıtlı sunum oturumu yok.</strong>
          <span>İlk vakanızı oluşturduğunuzda burada hızlı erişim olarak görünecek.</span>
        </div>
      ) : (
        <div className="session-list" aria-label="Son vaka sunumları">
          {sessions.map((session) => (
            <article className={`session-row${session.available ? "" : " unavailable"}`} key={session.caseId}>
              <button
                className="session-open"
                disabled={busy !== null || !session.available}
                onClick={() => void onActivate(session.caseId)}
                type="button"
              >
                <strong>{session.title}</strong>
                <span>
                  {session.folderName} · {new Date(session.lastOpenedAt).toLocaleString("tr-TR")}
                </span>
              </button>
              <div className="session-actions">
                {repairCaseId === session.caseId ? (
                  <button
                    className="button secondary"
                    disabled={busy !== null}
                    onClick={() => void onRepairAsset(session.caseId)}
                    type="button"
                  >
                    Eksik görüntüyü onar
                  </button>
                ) : null}
                {!session.available ? (
                  <button
                    className="button secondary"
                    onClick={() => void onRelink(session.caseId)}
                    type="button"
                  >
                    Yeniden bağla
                  </button>
                ) : null}
                <button className="button quiet" onClick={() => void onForget(session.caseId)} type="button">
                  Listeden kaldır
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <form className="case-start-form" onSubmit={handleCreate}>
        <label htmlFor="new-case-title">Vaka çalışma adı</label>
        <div className="case-start-row">
          <input
            disabled={busy !== null}
            id="new-case-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
          <button className="button primary" disabled={busy !== null || title.trim() === ""} type="submit">
            {busy === "create" ? "Oluşturuluyor…" : "Yeni vaka oluştur"}
          </button>
        </div>
        <p className="field-help">Sonraki adımda vaka klasörlerinin tutulacağı ana konumu seçersiniz.</p>
      </form>
      <div className="open-existing">
        <div>
          <strong>Mevcut bir vaka var mı?</strong>
          <span>`case.json` içeren yönetilen vaka klasörünü seçin.</span>
        </div>
        <button
          className="button secondary"
          disabled={busy !== null}
          onClick={() => void onOpen()}
          type="button"
        >
          {busy === "open" ? "Açılıyor…" : "Vaka klasörünü aç"}
        </button>
      </div>
      {error === null ? null : (
        <p className="workspace-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ExpectedRecordShape({ group }: { readonly group: RecordGroup }): ReactNode {
  return (
    <svg aria-hidden="true" className={`record-shape ${group}`} viewBox="0 0 160 104">
      <rect className="shape-frame" height="82" rx="8" width="132" x="14" y="11" />
      {group === "extraoral" ? (
        <>
          <ellipse className="shape-line" cx="80" cy="48" rx="22" ry="29" />
          <path className="shape-line" d="M55 88c8-18 42-18 50 0" />
        </>
      ) : null}
      {group === "intraoral" ? (
        <>
          <path className="shape-line" d="M42 53c17-22 59-22 76 0-16 26-61 26-76 0Z" />
          <path className="shape-guide" d="M80 30v47" />
        </>
      ) : null}
      {group === "models" ? (
        <>
          <path className="shape-line" d="M39 69c9-34 73-34 82 0" />
          <path className="shape-line" d="M49 72c11-22 51-22 62 0" />
        </>
      ) : null}
      {group === "imaging" ? (
        <>
          <ellipse className="shape-line" cx="69" cy="48" rx="27" ry="31" />
          <path className="shape-line" d="M72 29c28 2 33 19 22 29l15 9-25 9" />
          <path className="shape-guide" d="M34 83 121 18" />
        </>
      ) : null}
    </svg>
  );
}

function RecordCard({
  active,
  asset,
  disabled,
  onAssign,
  onSelect,
  slot,
}: {
  readonly active: boolean;
  readonly asset: CaseView["assets"][string] | undefined;
  readonly disabled: boolean;
  readonly onAssign: (slotId: RecordSlotId) => void;
  readonly onSelect: (slotId: RecordSlotId) => void;
  readonly slot: (typeof RECORD_SLOTS)[number];
}): ReactNode {
  return (
    <article
      className={`record-card${active ? " selected" : ""}${asset === undefined ? " empty" : " assigned"}`}
    >
      <button
        aria-pressed={active}
        className="record-card-main"
        onClick={() => onSelect(slot.id)}
        type="button"
      >
        <span className="record-visual">
          {asset === undefined ? (
            <ExpectedRecordShape group={slot.group} />
          ) : (
            <img alt="" src={asset.thumbnailDataUrl} />
          )}
          <span className="record-state">{asset === undefined ? "Eksik" : "Atandı"}</span>
        </span>
        <span className="record-card-copy">
          <strong>{slot.label}</strong>
          <span>{asset?.displayName ?? GROUP_LABELS[slot.group]}</span>
        </span>
      </button>
      <button className="record-assign" disabled={disabled} onClick={() => onAssign(slot.id)} type="button">
        {asset === undefined ? "Dosya seç" : "Değiştir"}
      </button>
    </article>
  );
}

function RecordPreview({
  asset,
  disabled,
  onAssign,
  slot,
}: {
  readonly asset: CaseView["assets"][string] | undefined;
  readonly disabled: boolean;
  readonly onAssign: (slotId: RecordSlotId) => void;
  readonly slot: (typeof RECORD_SLOTS)[number];
}): ReactNode {
  return (
    <aside className="record-preview" aria-label="Seçili kayıt önizlemesi">
      <div className="preview-heading">
        <span>{GROUP_LABELS[slot.group]}</span>
        <strong>{slot.requirement === "required" ? "Gerekli" : "Genellikle gerekli"}</strong>
      </div>
      <div className={`preview-image ${asset === undefined ? "empty" : ""}`}>
        {asset === undefined ? (
          <ExpectedRecordShape group={slot.group} />
        ) : (
          <img alt={`${slot.label} küçük resmi`} src={asset.thumbnailDataUrl} />
        )}
      </div>
      <h2>{slot.label}</h2>
      {asset === undefined ? (
        <p>
          Bu kayıt henüz atanmadı. Doğru görüntüyü seçtiğinizde yönetilen kopya ve küçük resim oluşturulur.
        </p>
      ) : (
        <dl className="record-metadata">
          <div>
            <dt>Dosya</dt>
            <dd>{asset.displayName}</dd>
          </div>
          <div>
            <dt>Boyut</dt>
            <dd>
              {asset.width} × {asset.height}
            </dd>
          </div>
          <div>
            <dt>Biçim</dt>
            <dd>{asset.mimeType === "image/jpeg" ? "JPEG" : "PNG"}</dd>
          </div>
        </dl>
      )}
      <button
        className="button primary preview-action"
        disabled={disabled}
        onClick={() => onAssign(slot.id)}
        type="button"
      >
        {asset === undefined ? "Yerel dosya seç" : "Görüntüyü değiştir"}
      </button>
    </aside>
  );
}

function RecordBoard({
  busy,
  caseView,
  error,
  onCaseChange,
  onImport,
  uiState,
  onUiStateChange,
}: {
  readonly busy: BusyAction;
  readonly caseView: CaseView;
  readonly error: string | null;
  readonly onCaseChange: (caseView: CaseView) => void;
  readonly onImport: (slotId: RecordSlotId) => Promise<void>;
  readonly uiState: WorkspaceUiState;
  readonly onUiStateChange: (next: WorkspaceUiState) => void;
}): ReactNode {
  const filter = uiState.recordFilter as Filter;
  const selectedSlotId = uiState.selectedRecordSlotId;
  const visibleSlots = useMemo(
    () => RECORD_SLOTS.filter((slot) => filter === "all" || slot.group === filter),
    [filter],
  );
  const selectedSlot = RECORD_SLOTS.find((slot) => slot.id === selectedSlotId) ?? RECORD_SLOTS[0];
  const assignedCount = Object.keys(caseView.assignments).length;
  const selectedAssetId = caseView.assignments[selectedSlot.id];
  const selectedAsset = selectedAssetId === undefined ? undefined : caseView.assets[selectedAssetId];
  const disabled = busy !== null || caseView.title.trim() === "";

  return (
    <section className="record-workspace">
      <header className="case-header">
        <div className="case-title-field">
          <label htmlFor="case-title">Vaka çalışma adı</label>
          <input
            disabled={disabled}
            id="case-title"
            maxLength={120}
            onChange={(event) => onCaseChange({ ...caseView, title: event.target.value })}
            value={caseView.title}
          />
          <span>{caseView.folderName}</span>
        </div>
        <span className="autosave-hint">Sekme değiştirirken ve çıkarken kaydedilir</span>
      </header>

      <div className="board-toolbar">
        <div>
          <h1>Kayıt panosu</h1>
          <p>
            <strong>{assignedCount}</strong> / {RECORD_SLOTS.length} kayıt atandı
          </p>
        </div>
        <div className="filter-row" aria-label="Kayıt grubu filtresi">
          {(["all", "extraoral", "intraoral", "models", "inferior", "imaging", "optional"] as const).map(
            (filterId) => (
              <button
                aria-pressed={filter === filterId}
                className="filter-button"
                key={filterId}
                onClick={() => {
                  if (filterId !== "all") {
                    const firstSlot = RECORD_SLOTS.find((slot) => slot.group === filterId);
                    if (firstSlot !== undefined)
                      onUiStateChange({
                        ...uiState,
                        recordFilter: filterId,
                        selectedRecordSlotId: firstSlot.id,
                      });
                  } else onUiStateChange({ ...uiState, recordFilter: filterId });
                }}
                type="button"
              >
                {filterId === "all" ? "Tümü" : GROUP_LABELS[filterId]}
              </button>
            ),
          )}
        </div>
      </div>

      {error === null ? null : (
        <p className="workspace-error compact" role="alert">
          {error}
        </p>
      )}

      <div className="board-layout">
        <div className="record-grid">
          {visibleSlots.map((slot) => {
            const assetId = caseView.assignments[slot.id];
            return (
              <RecordCard
                active={slot.id === selectedSlot.id}
                asset={assetId === undefined ? undefined : caseView.assets[assetId]}
                disabled={disabled}
                key={slot.id}
                onAssign={(slotId) => void onImport(slotId)}
                onSelect={(slotId) => onUiStateChange({ ...uiState, selectedRecordSlotId: slotId })}
                slot={slot}
              />
            );
          })}
        </div>
        <RecordPreview
          asset={selectedAsset}
          disabled={disabled}
          onAssign={(slotId) => void onImport(slotId)}
          slot={selectedSlot}
        />
      </div>
    </section>
  );
}

function CasesPage({
  caseView,
  onCaseChange,
  onRegisterFlush,
  onSaveStatusChange,
  uiState,
  onUiStateChange,
}: {
  readonly caseView: CaseView | null;
  readonly onCaseChange: (caseView: CaseView | null) => void;
  readonly onRegisterFlush: RegisterFlush;
  readonly onSaveStatusChange: (status: SaveStatus) => void;
  readonly uiState: WorkspaceUiState;
  readonly onUiStateChange: (next: WorkspaceUiState) => void;
}): ReactNode {
  const [persistedTitle, setPersistedTitle] = useState(caseView?.title ?? "");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptCase = useCallback(
    (nextCase: CaseView): void => {
      onCaseChange(nextCase);
      setPersistedTitle(nextCase.title);
      setError(null);
    },
    [onCaseChange],
  );

  useEffect(() => {
    if (caseView !== null) setPersistedTitle(caseView.title);
  }, [caseView?.caseId]);

  useEffect(() => {
    if (caseView === null) return;
    onSaveStatusChange(caseView.title === persistedTitle ? "saved" : "pending");
  }, [caseView?.caseId, caseView?.title, persistedTitle, onSaveStatusChange]);

  const saveCurrentCase = useCallback(async (): Promise<CaseView | null> => {
    if (caseView === null) return null;
    if (caseView.title === persistedTitle) return caseView;
    onSaveStatusChange("saving");
    try {
      const saved = await window.vakamatik.saveCase({
        caseId: caseView.caseId,
        revision: caseView.revision,
        title: caseView.title,
      });
      acceptCase(saved);
      onSaveStatusChange("saved");
      return saved;
    } catch {
      setError("Vaka adı kaydedilemedi. Değeri kontrol edip yeniden deneyin.");
      onSaveStatusChange("error");
      return null;
    }
  }, [acceptCase, caseView, onSaveStatusChange, persistedTitle]);

  useEffect(() => {
    onRegisterFlush(async () => (await saveCurrentCase()) !== null);
    return () => onRegisterFlush(null);
  }, [onRegisterFlush, saveCurrentCase]);

  const importImage = async (slotId: RecordSlotId): Promise<void> => {
    if (caseView === null) return;
    setBusy("import");
    setError(null);
    try {
      const current = caseView.title === persistedTitle ? caseView : await saveCurrentCase();
      if (current === null) return;
      const result = await window.vakamatik.importCaseImage({
        caseId: current.caseId,
        revision: current.revision,
        slotId,
      });
      if (result.status === "ok") acceptCase(result.case);
    } catch {
      setError("Görüntü atanamadı. JPEG veya PNG dosyası seçip yeniden deneyin.");
    } finally {
      setBusy(null);
    }
  };

  if (caseView === null) return null;

  return (
    <RecordBoard
      busy={busy}
      caseView={caseView}
      error={error}
      onCaseChange={(nextCase) => onCaseChange(nextCase)}
      onImport={importImage}
      uiState={uiState}
      onUiStateChange={onUiStateChange}
    />
  );
}

function PresentationPage({
  caseView,
  onCaseChange,
  onRegisterFlush,
  onSaveStatusChange,
  uiState,
  onUiStateChange,
}: {
  readonly caseView: CaseView | null;
  readonly onCaseChange: (next: CaseView) => void;
  readonly onRegisterFlush: RegisterFlush;
  readonly onSaveStatusChange: (status: SaveStatus) => void;
  readonly uiState: WorkspaceUiState;
  readonly onUiStateChange: (next: WorkspaceUiState) => void;
}): ReactNode {
  const [presentation, setPresentation] = useState<PresentationView | null>(null);
  const selectedId = uiState.selectedSlideId;
  const [layerChoices, setLayerChoices] = useState<{
    readonly xPercent: number;
    readonly yPercent: number;
    readonly layers: readonly PresentationView["slides"][number]["imageLayers"][number][];
  } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "exporting" | "acknowledging">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [draftTransform, setDraftTransform] = useState<ImageAdjustment | null>(null);
  const alignmentControlsRef = useRef<AlignmentControlsHandle>(null);
  const rotationDragRef = useRef<{
    readonly pointerId: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly startPointerAngle: number;
    readonly startRotation: number;
  } | null>(null);

  const flushAlignment = useCallback(async (): Promise<{
    readonly caseView: CaseView | null;
    readonly ok: boolean;
  }> => {
    if (caseView === null) return { caseView: null, ok: true };
    return (await alignmentControlsRef.current?.flush()) ?? { caseView, ok: true };
  }, [caseView]);

  useEffect(() => {
    onRegisterFlush(async () => (await flushAlignment()).ok);
    return () => onRegisterFlush(null);
  }, [flushAlignment, onRegisterFlush]);

  useEffect(() => {
    if (caseView === null) {
      setPresentation(null);
      return;
    }
    let active = true;
    setState("loading");
    setMessage(null);
    void window.vakamatik
      .getPresentation({ caseId: caseView.caseId, revision: caseView.revision })
      .then((nextPresentation) => {
        if (!active) return;
        setPresentation(nextPresentation);
        if (!nextPresentation.slides.some((slide) => slide.semanticSlideId === selectedId)) {
          onUiStateChange({
            ...uiState,
            selectedSlideId: nextPresentation.slides[0]?.semanticSlideId ?? null,
          });
        }
      })
      .catch(() => {
        if (active) setMessage("Sunum önizlemesi oluşturulamadı. Kayıtları kontrol edip yeniden deneyin.");
      })
      .finally(() => {
        if (active) setState("idle");
      });
    return () => {
      active = false;
    };
  }, [caseView?.caseId, caseView?.revision]);

  if (caseView === null) {
    return (
      <section className="empty-workspace presentation-empty">
        <div className="empty-copy">
          <h1>Önce bir vaka açın.</h1>
          <p>
            Sunum, açık vakanın yönetilen kayıtlarından hazırlanır. Kayıt panosundan yeni vaka oluşturun veya
            mevcut vaka klasörünü açın.
          </p>
        </div>
        <NavLink className="button primary inline-action" to="/">
          Kayıt panosuna git
        </NavLink>
      </section>
    );
  }

  const selectedSlide =
    presentation?.slides.find((slide) => slide.semanticSlideId === selectedId) ?? presentation?.slides[0];
  const selectedWarnings =
    presentation?.warnings.filter((warning) => warning.semanticSlideId === selectedSlide?.semanticSlideId) ??
    [];
  const selectedLayer = selectedSlide?.imageLayers.find(
    (layer) => layer.instanceId === uiState.selectedLayerId,
  );
  const renderedTransform = draftTransform ?? selectedLayer?.transform;

  const selectLayer = async (instanceId: string | null): Promise<void> => {
    if (instanceId === uiState.selectedLayerId) return;
    const result = await flushAlignment();
    if (!result.ok) return;
    setLayerChoices(null);
    setDraftTransform(null);
    onUiStateChange({ ...uiState, selectedLayerId: instanceId });
  };

  const selectSlide = async (semanticSlideId: string): Promise<void> => {
    if (semanticSlideId === selectedSlide?.semanticSlideId) return;
    const result = await flushAlignment();
    if (!result.ok) return;
    setLayerChoices(null);
    setDraftTransform(null);
    onUiStateChange({ ...uiState, selectedSlideId: semanticSlideId, selectedLayerId: null });
  };

  const exportPresentation = async (): Promise<void> => {
    setState("exporting");
    setMessage(null);
    try {
      const flushed = await flushAlignment();
      if (!flushed.ok || flushed.caseView === null) return;
      const result = await window.vakamatik.exportPresentation({
        caseId: flushed.caseView.caseId,
        revision: flushed.caseView.revision,
      });
      if (result.status === "ok") {
        setMessage(`${result.fileName} oluşturuldu — ${result.slideCount} slayt.`);
      }
    } catch {
      setMessage("PowerPoint oluşturulamadı. Sunum uyarılarını ve kayıtları kontrol edin.");
    } finally {
      setState("idle");
    }
  };

  const acknowledgeWarnings = async (): Promise<void> => {
    if (presentation === null) return;
    setState("acknowledging");
    setMessage(null);
    try {
      const flushed = await flushAlignment();
      if (!flushed.ok || flushed.caseView === null) return;
      const saved = await window.vakamatik.acknowledgePresentationWarnings({
        caseId: flushed.caseView.caseId,
        revision: flushed.caseView.revision,
        warningKeys: presentation.warnings.map((warning) => warning.key),
      });
      onCaseChange(saved);
      setMessage("Mevcut eksik içerik uyarıları klinisyen tarafından kabul edildi.");
    } catch {
      setMessage("Uyarılar kabul edilemedi; sunumu yenileyip tekrar deneyin.");
    } finally {
      setState("idle");
    }
  };

  return (
    <section className="presentation-workspace">
      <header className="presentation-toolbar">
        <div>
          <h1>Sunum oluşturucu</h1>
          <p>
            {caseView.title} · {presentation?.slides.length ?? "—"} slayt ·{" "}
            {presentation?.warnings.length ?? "—"} eksik içerik
          </p>
        </div>
        <div className="presentation-actions">
          {presentation?.hasUnacknowledgedWarnings === true ? (
            <button
              className="button secondary"
              disabled={state !== "idle"}
              onClick={() => void acknowledgeWarnings()}
              type="button"
            >
              {state === "acknowledging" ? "Kabul ediliyor…" : "Eksikleri kabul et"}
            </button>
          ) : null}
          <button
            className="button primary"
            disabled={state !== "idle" || presentation === null || presentation.hasUnacknowledgedWarnings}
            onClick={() => void exportPresentation()}
            type="button"
          >
            {state === "exporting" ? "PowerPoint oluşturuluyor…" : "PowerPoint dışa aktar"}
          </button>
        </div>
      </header>
      {message === null ? null : (
        <p className="presentation-message" role="status">
          {message}
        </p>
      )}
      {state === "loading" ? <p className="presentation-loading">Slaytlar hesaplanıyor…</p> : null}
      {presentation === null ? null : (
        <div className="presentation-layout">
          <aside className="slide-strip" aria-label="Slayt küçük resimleri">
            {presentation.slides.map((slide) => {
              const warningCount = presentation.warnings.filter(
                (warning) => warning.semanticSlideId === slide.semanticSlideId,
              ).length;
              return (
                <button
                  aria-current={slide.semanticSlideId === selectedSlide?.semanticSlideId ? "true" : undefined}
                  className="slide-thumbnail"
                  key={slide.semanticSlideId}
                  onClick={() => void selectSlide(slide.semanticSlideId)}
                  type="button"
                >
                  <span className="slide-thumbnail-image">
                    <img alt="" src={slide.previewDataUrl} />
                    <span>{slide.displayNumber}</span>
                  </span>
                  <span className="slide-thumbnail-copy">
                    <strong>{slide.title}</strong>
                    <small>{warningCount === 0 ? "Hazır" : `${warningCount} uyarı`}</small>
                  </span>
                </button>
              );
            })}
          </aside>
          <div className="slide-stage-column">
            {selectedSlide === undefined ? null : (
              <>
                <div className="slide-stage-heading">
                  <div>
                    <span>Slayt {selectedSlide.displayNumber}</span>
                    <h2>{selectedSlide.title}</h2>
                  </div>
                  <code>{selectedSlide.semanticSlideId}</code>
                </div>
                <div
                  className={`slide-stage${selectedSlide.imageLayers.length > 0 ? " selectable" : ""}`}
                  onClick={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const xPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
                    const yPercent = ((event.clientY - bounds.top) / bounds.height) * 100;
                    const hits = hitTestImageLayers(
                      selectedSlide.imageLayers,
                      (xPercent / 100) * 720,
                      (yPercent / 100) * 540,
                    );
                    if (hits.length === 0) {
                      void selectLayer(null);
                    } else if (hits.length === 1) {
                      const firstHit = hits[0];
                      if (firstHit !== undefined) void selectLayer(firstHit.instanceId);
                    } else setLayerChoices({ xPercent, yPercent, layers: hits });
                  }}
                  role="group"
                  aria-label="Tıklayarak görüntü katmanı seçilebilen slayt önizlemesi"
                >
                  <img alt={`${selectedSlide.title} önizlemesi`} src={selectedSlide.previewDataUrl} />
                  {selectedLayer === undefined || renderedTransform === undefined ? null : (
                    <span
                      className="selected-layer-outline"
                      style={{
                        left: `${
                          ((selectedLayer.bounds.xPt +
                            renderedTransform.translationXPt -
                            (selectedLayer.bounds.widthPt * renderedTransform.uniformScale -
                              selectedLayer.bounds.widthPt) /
                              2) /
                            720) *
                          100
                        }%`,
                        top: `${
                          ((selectedLayer.bounds.yPt +
                            renderedTransform.translationYPt -
                            (selectedLayer.bounds.heightPt * renderedTransform.uniformScale -
                              selectedLayer.bounds.heightPt) /
                              2) /
                            540) *
                          100
                        }%`,
                        width: `${((selectedLayer.bounds.widthPt * renderedTransform.uniformScale) / 720) * 100}%`,
                        height: `${((selectedLayer.bounds.heightPt * renderedTransform.uniformScale) / 540) * 100}%`,
                        transform: `rotate(${renderedTransform.rotationDeg}deg)`,
                      }}
                    >
                      <span>{selectedLayer.label}</span>
                      <button
                        aria-label={`${selectedLayer.label} görüntüsünü döndür`}
                        className="rotation-handle"
                        onClick={(rotationEvent) => rotationEvent.stopPropagation()}
                        onPointerDown={(rotationEvent) => {
                          rotationEvent.preventDefault();
                          rotationEvent.stopPropagation();
                          const stageBounds = rotationEvent.currentTarget
                            .closest(".slide-stage")
                            ?.getBoundingClientRect();
                          if (stageBounds === undefined) return;
                          const centerX =
                            stageBounds.left +
                            ((selectedLayer.bounds.xPt +
                              renderedTransform.translationXPt +
                              selectedLayer.bounds.widthPt / 2) /
                              720) *
                              stageBounds.width;
                          const centerY =
                            stageBounds.top +
                            ((selectedLayer.bounds.yPt +
                              renderedTransform.translationYPt +
                              selectedLayer.bounds.heightPt / 2) /
                              540) *
                              stageBounds.height;
                          rotationDragRef.current = {
                            pointerId: rotationEvent.pointerId,
                            centerX,
                            centerY,
                            startPointerAngle:
                              (Math.atan2(rotationEvent.clientY - centerY, rotationEvent.clientX - centerX) *
                                180) /
                              Math.PI,
                            startRotation: renderedTransform.rotationDeg,
                          };
                          rotationEvent.currentTarget.setPointerCapture(rotationEvent.pointerId);
                        }}
                        onPointerMove={(rotationEvent) => {
                          const drag = rotationDragRef.current;
                          if (drag === null || drag.pointerId !== rotationEvent.pointerId) return;
                          const angle =
                            (Math.atan2(
                              rotationEvent.clientY - drag.centerY,
                              rotationEvent.clientX - drag.centerX,
                            ) *
                              180) /
                            Math.PI;
                          alignmentControlsRef.current?.setRotationDeg(
                            rotationFromPointerDrag(drag.startRotation, drag.startPointerAngle, angle),
                          );
                        }}
                        onPointerUp={(rotationEvent) => {
                          if (rotationDragRef.current?.pointerId === rotationEvent.pointerId)
                            rotationDragRef.current = null;
                        }}
                        onPointerCancel={() => {
                          rotationDragRef.current = null;
                        }}
                        type="button"
                      >
                        <svg aria-hidden="true" viewBox="0 0 20 20">
                          <path d="M15.8 7.2A6.2 6.2 0 1 0 16 12M15.8 3.8v3.7h-3.7" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {layerChoices === null ? null : (
                    <div
                      className="layer-choice-popover"
                      style={{ left: `${layerChoices.xPercent}%`, top: `${layerChoices.yPercent}%` }}
                    >
                      <strong>Görüntü seçin</strong>
                      {layerChoices.layers.map((layer) => (
                        <button
                          key={layer.instanceId}
                          onClick={(choiceEvent) => {
                            choiceEvent.stopPropagation();
                            void selectLayer(layer.instanceId);
                          }}
                          type="button"
                        >
                          {layer.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <aside className="presentation-inspector" aria-label="Slayt düzenleme paneli">
            {selectedSlide === undefined ? null : (
              <>
                <AlignmentControls
                  caseView={caseView}
                  onCaseChange={onCaseChange}
                  onDraftTransformChange={setDraftTransform}
                  onSaveStatusChange={onSaveStatusChange}
                  onSelect={(instanceId) => void selectLayer(instanceId)}
                  onSlidePreview={(nextSlide) =>
                    setPresentation((current) =>
                      current === null
                        ? null
                        : {
                            ...current,
                            slides: current.slides.map((slide) =>
                              slide.semanticSlideId === nextSlide.semanticSlideId ? nextSlide : slide,
                            ),
                          },
                    )
                  }
                  ref={alignmentControlsRef}
                  selectedInstanceId={uiState.selectedLayerId}
                  slide={selectedSlide}
                />
                <section className="slide-warnings" aria-label="Seçili slayt uyarıları">
                  <h3>Eksik içerik</h3>
                  {selectedWarnings.length === 0 ? (
                    <p>Bu slayt için eksik içerik uyarısı yok.</p>
                  ) : (
                    <ul>
                      {selectedWarnings.map((warning) => {
                        const copy = warningDisplayCopy(warning.targetKey, warning.message);
                        return (
                          <li className={warning.acknowledged ? "acknowledged" : ""} key={warning.key}>
                            <strong>{copy.title}</strong>
                            <span>{copy.detail}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function SystemPage(): ReactNode {
  const controls = [
    ["Renderer izolasyonu", "Etkin"],
    ["Node.js erişimi", "Kapalı"],
    ["Vaka dosyaları", "Yerel ve yönetilen"],
    ["Kaynak görüntüler", "Değiştirilmez"],
    ["Telemetri ve analiz", "Yok"],
  ] as const;

  return (
    <section className="page">
      <div className="page-heading compact">
        <h1>Sistem durumu</h1>
        <p>Yerel vaka çalışma alanının güvenlik ve veri sınırları.</p>
      </div>
      <dl className="control-list">
        {controls.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AboutPage(): ReactNode {
  const [appInfoState, setAppInfoState] = useState<
    { kind: "loading" } | { kind: "ready"; info: ShellAppInfo } | { kind: "error" }
  >({ kind: "loading" });

  useEffect(() => {
    void window.vakamatik
      .getAppInfo()
      .then((info) => setAppInfoState({ kind: "ready", info }))
      .catch(() => setAppInfoState({ kind: "error" }));
  }, []);

  const appInfo = appInfoState.kind === "ready" ? appInfoState.info : null;
  const unavailableValue = appInfoState.kind === "error" ? "Okunamadı" : "Yükleniyor";

  return (
    <section className="page">
      <div className="page-heading compact">
        <h1>Vakamatik hakkında</h1>
        <p>Ortodontik vaka sunumlarını yerel ve düzenlenebilir biçimde üretmek için tasarlanmıştır.</p>
      </div>
      {appInfoState.kind === "error" ? (
        <p className="workspace-error" role="alert">
          Uygulama bilgisi okunamadı. Diğer güvenlik kontrolleri çalışmaya devam ediyor.
        </p>
      ) : null}
      <div className="about-ledger">
        <span>Uygulama</span>
        <strong>{appInfo?.name ?? unavailableValue}</strong>
        <span>Sürüm</span>
        <strong>{appInfo?.version ?? unavailableValue}</strong>
        <span>Platform</span>
        <strong>{appInfo?.platform ?? unavailableValue}</strong>
        <span>Bağlantı</span>
        <strong>Çevrimdışı</strong>
      </div>
    </section>
  );
}

export function App(): ReactNode {
  const navigate = useNavigate();
  const [caseView, setCaseView] = useState<CaseView | null>(null);
  const [sessions, setSessions] = useState<readonly CaseSessionSummary[]>([]);
  const [uiState, setUiState] = useState<WorkspaceUiState>({ ...defaultWorkspaceUiState });
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [closeRequested, setCloseRequested] = useState(false);
  const [repairCaseId, setRepairCaseId] = useState<string | null>(null);
  const activeFlushRef = useRef<(() => Promise<boolean>) | null>(null);

  const registerActiveFlush = useCallback<RegisterFlush>((flush) => {
    activeFlushRef.current = flush;
  }, []);

  const flushActiveEdits = useCallback(async (): Promise<boolean> => {
    return flushBeforeTransition(activeFlushRef.current);
  }, []);

  const refreshSessions = async (): Promise<readonly CaseSessionSummary[]> => {
    const result = await window.vakamatik.listCaseSessions({});
    setSessions(result.sessions);
    return result.sessions;
  };

  useEffect(() => {
    void refreshSessions().catch(() => setError("Kayıtlı sunum oturumları okunamadı."));
    return window.vakamatik.onCloseRequested(() => setCloseRequested(true));
  }, []);

  useEffect(() => {
    if (!closeRequested || saveStatus === "saving") return;
    setCloseRequested(false);
    void (async () => {
      if (!(await flushActiveEdits())) return;
      if (caseView !== null) {
        await window.vakamatik.saveCaseSessionUiState({ caseId: caseView.caseId, uiState });
      }
      await window.vakamatik.completeClose({});
    })().catch(() => {
      setError("Uygulama kapanmadan önce son değişiklikler kaydedilemedi.");
      setCloseRequested(false);
    });
  }, [closeRequested, saveStatus, caseView?.caseId, flushActiveEdits, uiState]);

  useEffect(() => {
    if (caseView === null) return;
    setSessions((current) =>
      current.map((session) =>
        session.caseId === caseView.caseId ? { ...session, title: caseView.title } : session,
      ),
    );
  }, [caseView?.caseId, caseView?.title]);

  const updateUiState = useCallback(
    (next: WorkspaceUiState): void => {
      setUiState(next);
      if (caseView === null) return;
      void window.vakamatik.saveCaseSessionUiState({ caseId: caseView.caseId, uiState: next }).catch(() => {
        setError("Oturum görünümü kaydedilemedi.");
      });
    },
    [caseView],
  );

  const acceptCase = async (nextCase: CaseView): Promise<void> => {
    setCaseView(nextCase);
    const nextSessions = await refreshSessions();
    setUiState(
      nextSessions.find((session) => session.caseId === nextCase.caseId)?.uiState ?? {
        ...defaultWorkspaceUiState,
      },
    );
    setError(null);
    setRepairCaseId(null);
    setSaveStatus("saved");
  };

  const createCase = async (title: string): Promise<void> => {
    setBusy("create");
    try {
      const result = await window.vakamatik.createCase({ title });
      if (result.status === "ok") await acceptCase(result.case);
    } catch {
      setError("Vaka oluşturulamadı. Yazılabilir bir yerel klasör seçip yeniden deneyin.");
    } finally {
      setBusy(null);
    }
  };

  const openCase = async (): Promise<void> => {
    setBusy("open");
    try {
      const result = await window.vakamatik.openCase({});
      if (result.status === "ok") await acceptCase(result.case);
    } catch {
      setError("Vaka açılamadı. Seçilen klasörde geçerli bir case.json olduğundan emin olun.");
    } finally {
      setBusy(null);
    }
  };

  const activateSession = async (caseId: string): Promise<void> => {
    if (!(await flushActiveEdits())) return;
    setBusy("open");
    try {
      if (caseView !== null) {
        await window.vakamatik.saveCaseSessionUiState({ caseId: caseView.caseId, uiState });
        await window.vakamatik.closeCase({ caseId: caseView.caseId });
        setCaseView(null);
      }
      await acceptCase(await window.vakamatik.activateCaseSession({ caseId }));
    } catch {
      setRepairCaseId(caseId);
      setError("Sunum oturumu açılamadı. Klasör taşındıysa yeniden bağlayın; görüntü eksikse onarın.");
    } finally {
      setBusy(null);
    }
  };

  const closeWorkspace = async (): Promise<void> => {
    if (caseView === null || !(await flushActiveEdits())) return;
    await window.vakamatik.saveCaseSessionUiState({ caseId: caseView.caseId, uiState });
    await window.vakamatik.closeCase({ caseId: caseView.caseId });
    setCaseView(null);
    await refreshSessions();
  };

  const switchWorkspaceTab = async (tab: WorkspaceTab): Promise<void> => {
    if (tab === uiState.tab || !(await flushActiveEdits())) return;
    updateUiState({ ...uiState, tab });
  };

  const navigateFromSidebar = async (path: string): Promise<void> => {
    if (!(await flushActiveEdits())) return;
    try {
      if (caseView !== null) {
        await window.vakamatik.saveCaseSessionUiState({ caseId: caseView.caseId, uiState });
      }
      navigate(path);
    } catch {
      setError("Sayfadan ayrılmadan önce oturum kaydedilemedi.");
    }
  };

  const forgetSession = async (caseId: string): Promise<void> => {
    await window.vakamatik.forgetCaseSession({ caseId });
    if (caseView?.caseId === caseId) setCaseView(null);
    await refreshSessions();
  };

  const relinkSession = async (caseId: string): Promise<void> => {
    try {
      const result = await window.vakamatik.relinkCaseSession({ caseId });
      if (result.status === "ok") await acceptCase(result.case);
    } catch {
      setError("Seçilen klasör bu sunum oturumuyla eşleşmiyor.");
    }
  };

  const repairMissingAsset = async (caseId: string): Promise<void> => {
    setBusy("repair");
    try {
      const result = await window.vakamatik.repairMissingCaseAsset({ caseId });
      if (result.status === "ok") {
        await acceptCase(result.case);
      } else if (result.status === "partial") {
        setError(
          `Görüntü onarıldı. ${result.remainingMissingAssets} eksik yönetilen görüntü daha onarılmalı.`,
        );
      }
    } catch {
      setError("Seçilen dosya eksik görüntünün özgün içeriğiyle eşleşmiyor.");
    } finally {
      setBusy(null);
    }
  };

  const workspace =
    caseView === null ? (
      <EmptyCaseWorkspace
        busy={busy}
        error={error}
        onActivate={activateSession}
        onCreate={createCase}
        onForget={forgetSession}
        onOpen={openCase}
        onRepairAsset={repairMissingAsset}
        onRelink={relinkSession}
        repairCaseId={repairCaseId}
        sessions={sessions}
      />
    ) : (
      <section className="case-session-workspace">
        <header className="session-topbar">
          <div className="session-identity">
            <span>Aktif sunum</span>
            <select
              aria-label="Aktif vaka sunumu"
              disabled={busy !== null || saveStatus === "saving"}
              onChange={(event) => void activateSession(event.target.value)}
              value={caseView.caseId}
            >
              {sessions
                .filter((session) => session.available)
                .map((session) => (
                  <option key={session.caseId} value={session.caseId}>
                    {session.title}
                  </option>
                ))}
            </select>
          </div>
          <nav aria-label="Sunum çalışma alanı" className="workspace-tabs">
            {(
              [
                ["records", "Kayıtlar"],
                ["clinical", "Klinik"],
                ["presentation", "Sunum"],
              ] as const
            ).map(([id, label]) => (
              <button
                aria-current={uiState.tab === id ? "page" : undefined}
                disabled={saveStatus === "saving"}
                key={id}
                onClick={() => void switchWorkspaceTab(id as WorkspaceTab)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className={`save-state ${saveStatus}`} role="status">
            <span>
              {saveStatus === "saving"
                ? "Kaydediliyor…"
                : saveStatus === "error"
                  ? "Kayıt hatası"
                  : saveStatus === "pending"
                    ? "Kaydedilmemiş değişiklik"
                    : "Kaydedildi"}
            </span>
            <button
              className="button quiet"
              disabled={saveStatus === "saving"}
              onClick={() => void closeWorkspace()}
              type="button"
            >
              Oturumlar
            </button>
          </div>
        </header>
        {uiState.tab === "records" ? (
          <CasesPage
            caseView={caseView}
            onCaseChange={setCaseView}
            onRegisterFlush={registerActiveFlush}
            onSaveStatusChange={setSaveStatus}
            onUiStateChange={updateUiState}
            uiState={uiState}
          />
        ) : null}
        {uiState.tab === "clinical" ? (
          <ClinicalPage
            caseView={caseView}
            onCaseChange={setCaseView}
            onRegisterFlush={registerActiveFlush}
            onSaveStatusChange={setSaveStatus}
            onSectionChange={(clinicalSection) => updateUiState({ ...uiState, clinicalSection })}
            section={uiState.clinicalSection}
          />
        ) : null}
        {uiState.tab === "presentation" ? (
          <PresentationPage
            caseView={caseView}
            onCaseChange={setCaseView}
            onRegisterFlush={registerActiveFlush}
            onSaveStatusChange={setSaveStatus}
            onUiStateChange={updateUiState}
            uiState={uiState}
          />
        ) : null}
      </section>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <BrandMark />
          <div>
            <span className="brand-name">Vakamatik</span>
            <span className="brand-description">Vaka sunum alanı</span>
          </div>
        </div>
        <Navigation onNavigate={navigateFromSidebar} />
        <p className="privacy-note">
          Yerel çalışır
          <br />
          Hasta verisi göndermez
        </p>
      </aside>
      <main className="main-surface">
        <header className="topbar global-topbar">
          <span>Ortodontik Vaka Sunum Oluşturucu</span>
          <span className="foundation-badge">Sunum oluşturucu</span>
        </header>
        <Routes>
          <Route element={workspace} path="/" />
          <Route element={<SystemPage />} path="/system" />
          <Route element={<AboutPage />} path="/about" />
        </Routes>
      </main>
    </div>
  );
}
