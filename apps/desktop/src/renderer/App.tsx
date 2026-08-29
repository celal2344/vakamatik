import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import type { ShellAppInfo } from "@vakamatik/desktop-contract";

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
    { to: "/", label: "Başlangıç", end: true },
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

function StartPage(): ReactNode {
  const [bridgeState, setBridgeState] = useState<"checking" | "ready" | "error">("checking");

  useEffect(() => {
    void window.vakamatik
      .ping({ nonce: "renderer-shell" })
      .then(() => {
        setBridgeState("ready");
      })
      .catch(() => {
        setBridgeState("error");
      });
  }, []);

  return (
    <section className="page start-page">
      <div className="page-heading">
        <h1>Çalışma alanı hazır.</h1>
        <p>Güvenli masaüstü temeli kuruldu. Klinik çalışma alanları sonraki kapılarda eklenecek.</p>
      </div>

      <div className="readiness-band" aria-live="polite">
        <div>
          <span className={`status-dot ${bridgeState}`} />
          <strong>
            {bridgeState === "ready"
              ? "Masaüstü köprüsü bağlı"
              : bridgeState === "error"
                ? "Köprü doğrulanamadı"
                : "Köprü doğrulanıyor"}
          </strong>
        </div>
        <span className="gate-label">2. Aşama · Yalnızca temel kabuk</span>
      </div>

      <div className="workspace-note">
        <h2>Bu sürüm neyi kanıtlıyor?</h2>
        <p>
          Vakamatik yerel içerikten açılıyor, ayrı süreç sınırları kullanıyor ve renderer'a yalnızca iki
          adlandırılmış, doğrulanan işlem veriyor. Hasta kaydı, dosya seçimi veya sunum düzenleme bu kapının
          kapsamında değil.
        </p>
      </div>
    </section>
  );
}

function SystemPage(): ReactNode {
  const controls = [
    ["Renderer izolasyonu", "Etkin"],
    ["Node.js erişimi", "Kapalı"],
    ["İzin istekleri", "Reddediliyor"],
    ["Harici gezinme", "Engelleniyor"],
    ["Telemetri ve analiz", "Yok"],
  ] as const;

  return (
    <section className="page">
      <div className="page-heading compact">
        <h1>Sistem durumu</h1>
        <p>Gate 2 güvenlik sınırlarının okunabilir özeti.</p>
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
      .then((info) => {
        setAppInfoState({ kind: "ready", info });
      })
      .catch(() => {
        setAppInfoState({ kind: "error" });
      });
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
        <p className="about-error" role="alert">
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
          <span className="foundation-badge">Temel sürüm</span>
        </header>
        <Routes>
          <Route element={<StartPage />} path="/" />
          <Route element={<SystemPage />} path="/system" />
          <Route element={<AboutPage />} path="/about" />
        </Routes>
      </main>
    </div>
  );
}
