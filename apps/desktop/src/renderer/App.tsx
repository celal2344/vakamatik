import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { RECORD_SLOTS, type RecordSlotId } from "@vakamatik/domain";
import type { CaseView, PresentationView, ShellAppInfo } from "@vakamatik/desktop-contract";
import { ClinicalPage } from "./ClinicalPage.js";
import { AlignmentControls } from "./AlignmentControls.js";

type RecordGroup = (typeof RECORD_SLOTS)[number]["group"];
type Filter = "all" | RecordGroup;
type BusyAction = "create" | "open" | "save" | "close" | "import" | null;

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

function Navigation(): ReactNode {
  const items = [
    { to: "/", label: "Kayıt panosu", end: true },
    { to: "/clinical", label: "Klinik düzenleme", end: false },
    { to: "/presentation", label: "Sunum", end: false },
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
  onCreate,
  onOpen,
}: {
  readonly busy: BusyAction;
  readonly error: string | null;
  readonly onCreate: (title: string) => Promise<void>;
  readonly onOpen: () => Promise<void>;
}): ReactNode {
  const [title, setTitle] = useState("Yeni ortodontik vaka");

  const handleCreate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onCreate(title);
  };

  return (
    <section className="empty-workspace">
      <div className="empty-copy">
        <h1>Vaka kayıtlarını tek yerde toplayın.</h1>
        <p>
          Yeni bir yerel vaka klasörü oluşturun veya daha önce oluşturduğunuz bir klasörü açın. Kaynak
          görüntüleriniz değiştirilmez; Vakamatik yönetilen kopyalarla çalışır.
        </p>
      </div>
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
  onClose,
  onImport,
  onSave,
}: {
  readonly busy: BusyAction;
  readonly caseView: CaseView;
  readonly error: string | null;
  readonly onCaseChange: (caseView: CaseView) => void;
  readonly onClose: () => Promise<void>;
  readonly onImport: (slotId: RecordSlotId) => Promise<void>;
  readonly onSave: () => Promise<void>;
}): ReactNode {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedSlotId, setSelectedSlotId] = useState<RecordSlotId>(RECORD_SLOTS[0].id);
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
        <div className="case-actions">
          <button
            className="button secondary"
            disabled={disabled || caseView.title.trim() === ""}
            onClick={() => void onSave()}
            type="button"
          >
            {busy === "save" ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            className="button quiet"
            disabled={disabled || caseView.title.trim() === ""}
            onClick={() => void onClose()}
            type="button"
          >
            {busy === "close" ? "Kapatılıyor…" : "Kaydet ve kapat"}
          </button>
        </div>
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
                  setFilter(filterId);
                  if (filterId !== "all") {
                    const firstSlot = RECORD_SLOTS.find((slot) => slot.group === filterId);
                    if (firstSlot !== undefined) setSelectedSlotId(firstSlot.id);
                  }
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
                onSelect={setSelectedSlotId}
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
}: {
  readonly caseView: CaseView | null;
  readonly onCaseChange: (caseView: CaseView | null) => void;
}): ReactNode {
  const [persistedTitle, setPersistedTitle] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptCase = (nextCase: CaseView): void => {
    onCaseChange(nextCase);
    setPersistedTitle(nextCase.title);
    setError(null);
  };

  const createCase = async (title: string): Promise<void> => {
    setBusy("create");
    setError(null);
    try {
      const result = await window.vakamatik.createCase({ title });
      if (result.status === "ok") acceptCase(result.case);
    } catch {
      setError("Vaka oluşturulamadı. Yazılabilir bir yerel klasör seçip yeniden deneyin.");
    } finally {
      setBusy(null);
    }
  };

  const openCase = async (): Promise<void> => {
    setBusy("open");
    setError(null);
    try {
      const result = await window.vakamatik.openCase({});
      if (result.status === "ok") acceptCase(result.case);
    } catch {
      setError("Vaka açılamadı. Seçilen klasörde geçerli bir case.json olduğundan emin olun.");
    } finally {
      setBusy(null);
    }
  };

  const saveCurrentCase = async (): Promise<CaseView | null> => {
    if (caseView === null) return null;
    const saved = await window.vakamatik.saveCase({
      caseId: caseView.caseId,
      revision: caseView.revision,
      title: caseView.title,
    });
    acceptCase(saved);
    return saved;
  };

  const saveCase = async (): Promise<void> => {
    setBusy("save");
    setError(null);
    try {
      await saveCurrentCase();
    } catch {
      setError("Vaka kaydedilemedi. Değişiklikleri korumak için yeniden deneyin.");
    } finally {
      setBusy(null);
    }
  };

  const closeCase = async (): Promise<void> => {
    if (caseView === null) return;
    setBusy("close");
    setError(null);
    try {
      const current = caseView.title === persistedTitle ? caseView : await saveCurrentCase();
      if (current === null) return;
      await window.vakamatik.closeCase({ caseId: current.caseId });
      onCaseChange(null);
      setPersistedTitle("");
    } catch {
      setError("Vaka kaydedilip kapatılamadı. Vaka açık bırakıldı; yeniden deneyin.");
    } finally {
      setBusy(null);
    }
  };

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

  if (caseView === null) {
    return <EmptyCaseWorkspace busy={busy} error={error} onCreate={createCase} onOpen={openCase} />;
  }

  return (
    <RecordBoard
      busy={busy}
      caseView={caseView}
      error={error}
      onCaseChange={(nextCase) => onCaseChange(nextCase)}
      onClose={closeCase}
      onImport={importImage}
      onSave={saveCase}
    />
  );
}

function PresentationPage({
  caseView,
  onCaseChange,
}: {
  readonly caseView: CaseView | null;
  readonly onCaseChange: (next: CaseView) => void;
}): ReactNode {
  const [presentation, setPresentation] = useState<PresentationView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "exporting" | "acknowledging">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (caseView === null) {
      setPresentation(null);
      setSelectedId(null);
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
        setSelectedId((current) =>
          nextPresentation.slides.some((slide) => slide.semanticSlideId === current)
            ? current
            : (nextPresentation.slides[0]?.semanticSlideId ?? null),
        );
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

  const exportPresentation = async (): Promise<void> => {
    setState("exporting");
    setMessage(null);
    try {
      const result = await window.vakamatik.exportPresentation({
        caseId: caseView.caseId,
        revision: caseView.revision,
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
      const saved = await window.vakamatik.acknowledgePresentationWarnings({
        caseId: caseView.caseId,
        revision: caseView.revision,
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
                  onClick={() => setSelectedId(slide.semanticSlideId)}
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
                <div className="slide-stage">
                  <img alt={`${selectedSlide.title} önizlemesi`} src={selectedSlide.previewDataUrl} />
                </div>
                <section className="slide-warnings" aria-label="Seçili slayt uyarıları">
                  <h3>Eksik içerik</h3>
                  {selectedWarnings.length === 0 ? (
                    <p>Bu slayt için eksik içerik uyarısı yok.</p>
                  ) : (
                    <ul>
                      {selectedWarnings.map((warning) => (
                        <li className={warning.acknowledged ? "acknowledged" : ""} key={warning.key}>
                          <strong>{warning.targetKey}</strong>
                          <span>{warning.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <AlignmentControls caseView={caseView} onCaseChange={onCaseChange} slide={selectedSlide} />
              </>
            )}
          </div>
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
  const [caseView, setCaseView] = useState<CaseView | null>(null);
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
        <Navigation />
        <p className="privacy-note">
          Yerel çalışır
          <br />
          Hasta verisi göndermez
        </p>
      </aside>
      <main className="main-surface">
        <header className="topbar">
          <span>Ortodontik Vaka Sunum Oluşturucu</span>
          <span className="foundation-badge">Sunum oluşturucu</span>
        </header>
        <Routes>
          <Route element={<CasesPage caseView={caseView} onCaseChange={setCaseView} />} path="/" />
          <Route element={<ClinicalPage caseView={caseView} onCaseChange={setCaseView} />} path="/clinical" />
          <Route
            element={<PresentationPage caseView={caseView} onCaseChange={setCaseView} />}
            path="/presentation"
          />
          <Route element={<SystemPage />} path="/system" />
          <Route element={<AboutPage />} path="/about" />
        </Routes>
      </main>
    </div>
  );
}
