import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { CANONICAL_SLIDE_ORDER } from "@vakamatik/export-contract";
import { CEPH_MEASUREMENTS, type ClinicalData } from "@vakamatik/domain";
import type { CaseView } from "@vakamatik/desktop-contract";

type Section = "patient" | "findings" | "analyses" | "ceph" | "planning" | "notes";

const sections: readonly [Section, string][] = [
  ["patient", "Hasta ve vaka"],
  ["findings", "Klinik bulgular"],
  ["analyses", "HN / Bolton"],
  ["ceph", "Sefalometri"],
  ["planning", "Problem / plan"],
  ["notes", "Notlar ve opsiyonlar"],
];

const patientFields = [
  ["patientName", "Hasta adı", "text"],
  ["dateOfBirth", "Doğum tarihi", "date"],
  ["patientAssignmentDate", "Hasta veriliş tarihi", "date"],
  ["recordsDate", "Kayıt tarihi", "date"],
  ["casePresentationDate", "Vaka sunum tarihi", "date"],
  ["treatmentStartDate", "Tedavi başlangıç tarihi", "date"],
  ["treatingDoctor", "Tedavi eden hekim", "text"],
  ["referringDoctor", "Sevk eden hekim", "text"],
  ["ageOverride", "Yaş (gerekirse manuel)", "text"],
] as const;

const findingTextFields = [
  ["facialSymmetry", "Yüz simetrisi"],
  ["smileLine", "Gülümseme hattı"],
  ["upperIncisorDisplay", "Üst kesici görünümü"],
  ["softTissueProfile", "Yumuşak doku profili"],
  ["threeQuarterNote", "Üç çeyrek görünüm notu"],
  ["cervicalMaturationStage", "Servikal maturasyon evresi"],
  ["upperMidline", "Üst orta hat"],
  ["lowerMidline", "Alt orta hat"],
  ["rightMolarRelationship", "Sağ molar ilişki"],
  ["leftMolarRelationship", "Sol molar ilişki"],
  ["rightCanineRelationship", "Sağ kanin ilişki"],
  ["leftCanineRelationship", "Sol kanin ilişki"],
  ["missingTeethFinding", "Eksik / süpernümerer diş bulgusu"],
  ["restorativeFinding", "Çürük, restorasyon, kron, endodonti ve diğer bulgular"],
  ["tmjFinding", "TME bulgusu"],
] as const;

const interpretationFields = [
  ["cervicalStage", "Servikal evre yorumu"],
  ["growthPattern", "Büyüme paterni"],
  ["skeletal", "İskeletsel yorum"],
  ["upperIncisor", "Üst kesici yorumu"],
  ["lowerIncisor", "Alt kesici yorumu"],
  ["softTissueProfile", "Yumuşak doku yorumu"],
  ["analysisSkeletal", "Analiz özeti — iskeletsel"],
  ["analysisDental", "Analiz özeti — dental"],
] as const;

function Field({
  label,
  children,
  wide = false,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly wide?: boolean;
}): ReactNode {
  return (
    <label className={`clinical-field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function numberValue(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export function ClinicalPage({
  caseView,
  onCaseChange,
}: {
  readonly caseView: CaseView | null;
  readonly onCaseChange: (next: CaseView) => void;
}): ReactNode {
  const [section, setSection] = useState<Section>("patient");
  const [draft, setDraft] = useState<ClinicalData | null>(caseView?.clinical ?? null);
  const [slide8Behavior, setSlide8Behavior] = useState<CaseView["presentation"]["slide8Behavior"]>(
    caseView?.presentation.slide8Behavior ?? "include",
  );
  const [noteSlide, setNoteSlide] = useState<(typeof CANONICAL_SLIDE_ORDER)[number]>(
    CANONICAL_SLIDE_ORDER[0],
  );
  const [state, setState] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(caseView?.clinical ?? null);
    setSlide8Behavior(caseView?.presentation.slide8Behavior ?? "include");
  }, [caseView?.caseId, caseView?.revision]);

  if (caseView === null || draft === null)
    return (
      <section className="empty-workspace">
        <div className="empty-copy">
          <h1>Önce bir vaka açın.</h1>
          <p>Klinik alanlar, açık vakanın yerel case.json dosyasında saklanır.</p>
        </div>
        <NavLink className="button primary inline-action" to="/">
          Kayıt panosuna git
        </NavLink>
      </section>
    );

  const save = async (): Promise<void> => {
    setState("saving");
    setMessage(null);
    try {
      const saved = await window.vakamatik.saveClinicalCase({
        caseId: caseView.caseId,
        revision: caseView.revision,
        clinical: draft,
        presentation: { ...caseView.presentation, slide8Behavior },
      });
      onCaseChange(saved);
      setMessage("Klinik değişiklikler kaydedildi; önizleme ve dışa aktarım güncellendi.");
    } catch {
      setMessage("Klinik alanlar kaydedilemedi. Değerleri kontrol edip yeniden deneyin.");
    } finally {
      setState("idle");
    }
  };

  const setPatient = (key: keyof ClinicalData["patient"], value: string): void =>
    setDraft({ ...draft, patient: { ...draft.patient, [key]: value } });
  const setFindingText = (key: (typeof findingTextFields)[number][0], value: string): void =>
    setDraft({ ...draft, findings: { ...draft.findings, [key]: value } });

  return (
    <section className="clinical-workspace">
      <header className="clinical-toolbar">
        <div>
          <h1>Klinik düzenleme</h1>
          <p>{caseView.title} · yorumlar yalnızca klinisyen tarafından yazılır veya onaylanır</p>
        </div>
        <button
          className="button primary"
          disabled={state !== "idle"}
          onClick={() => void save()}
          type="button"
        >
          {state === "saving" ? "Kaydediliyor…" : "Tüm değişiklikleri kaydet"}
        </button>
      </header>
      {message === null ? null : (
        <p className="presentation-message" role="status">
          {message}
        </p>
      )}
      <div className="clinical-layout">
        <nav aria-label="Klinik bölüm" className="clinical-section-nav">
          {sections.map(([id, label]) => (
            <button
              aria-current={section === id ? "page" : undefined}
              key={id}
              onClick={() => setSection(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="clinical-form">
          {section === "patient" ? (
            <>
              <div className="clinical-section-heading">
                <h2>Hasta ve vaka bilgileri</h2>
                <p>Tarih ve hekim bilgileri sunum kapağına bağlanır.</p>
              </div>
              <div className="clinical-grid">
                {patientFields.map(([key, label, type]) => (
                  <Field key={key} label={label}>
                    <input
                      type={type}
                      value={draft.patient[key]}
                      onChange={(event) => setPatient(key, event.target.value)}
                    />
                  </Field>
                ))}
                <Field label="Başvuru şikâyeti" wide>
                  <textarea
                    value={draft.patient.chiefComplaint}
                    onChange={(event) => setPatient("chiefComplaint", event.target.value)}
                  />
                </Field>
                <Field label="Anamnez" wide>
                  <textarea
                    value={draft.patient.anamnesis}
                    onChange={(event) => setPatient("anamnesis", event.target.value)}
                  />
                </Field>
              </div>
            </>
          ) : null}
          {section === "findings" ? (
            <>
              <div className="clinical-section-heading">
                <h2>Klinik ve radyografik bulgular</h2>
                <p>Belirsiz sınıflandırmalar serbest metinle kaydedilir; sistem tanı üretmez.</p>
              </div>
              <div className="clinical-grid">
                {findingTextFields.map(([key, label]) => (
                  <Field key={key} label={label} wide={key.endsWith("Finding") || key === "threeQuarterNote"}>
                    <textarea
                      value={draft.findings[key]}
                      onChange={(event) => setFindingText(key, event.target.value)}
                    />
                  </Field>
                ))}
                {(
                  [
                    ["overjetMm", "Overjet (mm)"],
                    ["overbiteMm", "Overbite (mm)"],
                    ["andrewsElementThreeMm", "Andrews Element III darlığı (mm)"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      step="0.1"
                      type="number"
                      value={draft.findings[key] ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          findings: { ...draft.findings, [key]: numberValue(event.target.value) },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </>
          ) : null}
          {section === "analyses" ? (
            <>
              <div className="clinical-section-heading">
                <h2>Hayes Nance ve Bolton</h2>
                <p>Yalnızca nihai sonuçlar manuel girilir. Diş düzeyinde hesaplama yapılmaz.</p>
              </div>
              <h3 className="clinical-subheading">Hayes Nance — işaretli mm</h3>
              <div className="clinical-grid">
                {(
                  [
                    ["upperTotal", "Üst toplam"],
                    ["upperRight", "Üst sağ"],
                    ["upperLeft", "Üst sol"],
                    ["lowerRight", "Alt sağ"],
                    ["lowerLeft", "Alt sol"],
                    ["lowerTotal", "Alt toplam"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      step="0.1"
                      type="number"
                      value={draft.hn[key] ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, hn: { ...draft.hn, [key]: numberValue(event.target.value) } })
                      }
                    />
                  </Field>
                ))}
              </div>
              <h3 className="clinical-subheading">Bolton — manuel nihai sonuç</h3>
              {(["anterior", "overall"] as const).map((key) => (
                <fieldset className="bolton-row" key={key}>
                  <legend>{key === "anterior" ? "Anterior" : "Toplam"}</legend>
                  <Field label="Durum">
                    <select
                      value={draft.bolton[key].status}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          bolton: {
                            ...draft.bolton,
                            [key]: {
                              ...draft.bolton[key],
                              status: event.target.value as "" | "calculable" | "not-calculable",
                            },
                          },
                        })
                      }
                    >
                      <option value="">Seçilmedi</option>
                      <option value="calculable">Hesaplanabilir</option>
                      <option value="not-calculable">Hesaplanamaz</option>
                    </select>
                  </Field>
                  <Field label="Etkilenen ark">
                    <select
                      value={draft.bolton[key].affectedArch}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          bolton: {
                            ...draft.bolton,
                            [key]: {
                              ...draft.bolton[key],
                              affectedArch: event.target.value as "" | "upper" | "lower",
                            },
                          },
                        })
                      }
                    >
                      <option value="">Seçilmedi</option>
                      <option value="upper">Üst</option>
                      <option value="lower">Alt</option>
                    </select>
                  </Field>
                  <Field label="Sapma (mm)">
                    <input
                      step="0.1"
                      type="number"
                      value={draft.bolton[key].discrepancyMm ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          bolton: {
                            ...draft.bolton,
                            [key]: { ...draft.bolton[key], discrepancyMm: numberValue(event.target.value) },
                          },
                        })
                      }
                    />
                  </Field>
                </fieldset>
              ))}
            </>
          ) : null}
          {section === "ceph" ? (
            <>
              <div className="clinical-section-heading">
                <h2>Sefalometrik ölçümler ve yorumlar</h2>
                <p>
                  T0 değerini birimiyle yazın. Yorumlar dışa aktarılmadan önce klinisyen onayı gerektirir.
                </p>
              </div>
              {(["vertical", "sagittal", "incisor", "soft_tissue"] as const).map((group) => (
                <section className="measurement-group" key={group}>
                  <h3>
                    {
                      {
                        vertical: "Vertikal",
                        sagittal: "Sagittal",
                        incisor: "Kesici",
                        soft_tissue: "Yumuşak doku",
                      }[group]
                    }
                  </h3>
                  <div className="measurement-grid">
                    {CEPH_MEASUREMENTS.filter((item) => item[3] === group).map(([key, label, reference]) => (
                      <label key={key}>
                        <span>
                          {label}
                          <small>{reference}</small>
                        </span>
                        <input
                          value={draft.measurements[key] ?? ""}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              measurements: { ...draft.measurements, [key]: event.target.value },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
              <h3 className="clinical-subheading">Klinisyen yorumları</h3>
              <div className="interpretation-list">
                {interpretationFields.map(([key, label]) => (
                  <div className="interpretation-row" key={key}>
                    <Field label={label} wide>
                      <textarea
                        value={draft.interpretations[key].text}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            interpretations: {
                              ...draft.interpretations,
                              [key]: {
                                ...draft.interpretations[key],
                                text: event.target.value,
                                approved: false,
                              },
                            },
                          })
                        }
                      />
                    </Field>
                    <label className="approval-check">
                      <input
                        checked={draft.interpretations[key].approved}
                        type="checkbox"
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            interpretations: {
                              ...draft.interpretations,
                              [key]: { ...draft.interpretations[key], approved: event.target.checked },
                            },
                          })
                        }
                      />
                      Klinisyen onayı
                    </label>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {section === "planning" ? (
            <>
              <div className="clinical-section-heading">
                <h2>Problem, hedef, plan ve vaka kararı</h2>
                <p>En fazla beş satır sunuma aktarılır.</p>
              </div>
              <div className="plan-editor">
                <div className="plan-header">
                  <span>#</span>
                  <span>Problem</span>
                  <span>Hedef</span>
                  <span>Plan</span>
                </div>
                {Array.from({ length: 5 }, (_, index) => {
                  const row = draft.problemGoalPlan[index] ?? { problem: "", goal: "", plan: "" };
                  return (
                    <div className="plan-row" key={index}>
                      <strong>{index + 1}</strong>
                      {(["problem", "goal", "plan"] as const).map((key) => (
                        <textarea
                          key={key}
                          value={row[key]}
                          onChange={(event) => {
                            const rows = Array.from(
                              { length: 5 },
                              (_, rowIndex) =>
                                draft.problemGoalPlan[rowIndex] ?? { problem: "", goal: "", plan: "" },
                            );
                            rows[index] = { ...row, [key]: event.target.value };
                            setDraft({ ...draft, problemGoalPlan: rows });
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="clinical-grid decision-fields">
                <Field label="Karar sahibi / başlık" wide>
                  <input
                    value={draft.decision.ownerTitle}
                    onChange={(event) =>
                      setDraft({ ...draft, decision: { ...draft.decision, ownerTitle: event.target.value } })
                    }
                  />
                </Field>
                <Field label="Vaka kararı maddeleri (satır başına bir madde)" wide>
                  <textarea
                    value={draft.decision.bullets.join("\n")}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        decision: { ...draft.decision, bullets: event.target.value.split("\n").slice(0, 12) },
                      })
                    }
                  />
                </Field>
              </div>
            </>
          ) : null}
          {section === "notes" ? (
            <>
              <div className="clinical-section-heading">
                <h2>Notlar ve opsiyonel içerik</h2>
                <p>
                  Slayt 16, 18, 21 ve 35 için görüntüleri Kayıt Panosu’ndaki opsiyonel gruplardan atayın.
                  Slayt 34 ICON satırları dolduğunda eklenir.
                </p>
              </div>
              <div className="clinical-grid">
                <Field label="Slayt 8 davranışı">
                  <select
                    value={slide8Behavior}
                    onChange={(event) => setSlide8Behavior(event.target.value as typeof slide8Behavior)}
                  >
                    <option value="include">Her zaman ekle</option>
                    <option value="omit-when-empty">Boşsa çıkar</option>
                  </select>
                </Field>
                <Field label="Vaka geneli notu" wide>
                  <textarea
                    value={draft.notes.caseNote}
                    onChange={(event) =>
                      setDraft({ ...draft, notes: { ...draft.notes, caseNote: event.target.value } })
                    }
                  />
                </Field>
                <Field label="Slayt notu seç">
                  <select
                    value={noteSlide}
                    onChange={(event) => setNoteSlide(event.target.value as typeof noteSlide)}
                  >
                    {CANONICAL_SLIDE_ORDER.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Seçili slaytın konuşmacı notu" wide>
                  <textarea
                    value={draft.notes.bySlide[noteSlide] ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        notes: {
                          ...draft.notes,
                          bySlide: { ...draft.notes.bySlide, [noteSlide]: event.target.value },
                        },
                      })
                    }
                  />
                </Field>
                <label className="approval-check wide">
                  <input
                    checked={draft.notes.exportSpeakerNotes}
                    type="checkbox"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        notes: { ...draft.notes, exportSpeakerNotes: event.target.checked },
                      })
                    }
                  />
                  Konuşmacı notlarını PowerPoint’e aktar
                </label>
              </div>
              <h3 className="clinical-subheading">ICON indeksi — manuel</h3>
              <div className="icon-editor">
                {Array.from({ length: 5 }, (_, index) => {
                  const row = draft.icon.rows[index] ?? { label: "", rawScore: "", weight: "", result: "" };
                  return (
                    <div key={index}>
                      <strong>{index + 1}</strong>
                      {(
                        [
                          ["label", "Bileşen"],
                          ["rawScore", "Ham"],
                          ["weight", "Ağırlık"],
                          ["result", "Sonuç"],
                        ] as const
                      ).map(([key, placeholder]) => (
                        <input
                          aria-label={`${placeholder} ${index + 1}`}
                          key={key}
                          placeholder={placeholder}
                          value={row[key]}
                          onChange={(event) => {
                            const rows = Array.from(
                              { length: 5 },
                              (_, rowIndex) =>
                                draft.icon.rows[rowIndex] ?? {
                                  label: "",
                                  rawScore: "",
                                  weight: "",
                                  result: "",
                                },
                            );
                            rows[index] = { ...row, [key]: event.target.value };
                            setDraft({ ...draft, icon: { ...draft.icon, rows } });
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
                <Field label="ICON toplam">
                  <input
                    value={draft.icon.total}
                    onChange={(event) =>
                      setDraft({ ...draft, icon: { ...draft.icon, total: event.target.value } })
                    }
                  />
                </Field>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
