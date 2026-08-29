import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { RECORD_SLOTS, type RecordSlotId } from "@vakamatik/domain";
import type { CaseView, ShellAppInfo } from "@vakamatik/desktop-contract";

type RecordGroup = (typeof RECORD_SLOTS)[number]["group"];
type Filter = "all" | RecordGroup;
type BusyAction = "create" | "open" | "save" | "close" | "import" | null;

const GROUP_LABELS: Readonly<Record<RecordGroup, string>> = {
  extraoral: "Ekstraoral",
  intraoral: "İntraoral",
  models: "Modeller",
  imaging: "Görüntüleme",
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
          {(["all", "extraoral", "intraoral", "models", "imaging"] as const).map((filterId) => (
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
          ))}
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

function CasesPage(): ReactNode {
  const [caseView, setCaseView] = useState<CaseView | null>(null);
  const [persistedTitle, setPersistedTitle] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptCase = (nextCase: CaseView): void => {
    setCaseView(nextCase);
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
      setCaseView(null);
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
      onCaseChange={setCaseView}
      onClose={closeCase}
      onImport={importImage}
      onSave={saveCase}
    />
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
          <span className="foundation-badge">Temel vakalar</span>
        </header>
        <Routes>
          <Route element={<CasesPage />} path="/" />
          <Route element={<SystemPage />} path="/system" />
          <Route element={<AboutPage />} path="/about" />
        </Routes>
      </main>
    </div>
  );
}
