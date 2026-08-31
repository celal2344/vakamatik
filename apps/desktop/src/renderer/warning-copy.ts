import { RECORD_SLOTS } from "@vakamatik/domain";

const recordLabelById = new Map<string, string>(RECORD_SLOTS.map((slot) => [slot.id, slot.label]));

const clinicalLabelByKey: Readonly<Record<string, string>> = {
  "patient.patientName": "Hasta adı",
  "patient.dateOfBirth": "Doğum tarihi",
  "patient.patientAssignmentDate": "Hasta veriliş tarihi",
  "patient.recordsDate": "Kayıt tarihi",
  "patient.casePresentationDate": "Vaka sunum tarihi",
  "patient.treatingDoctor": "Tedavi eden hekim",
  "patient.chiefComplaint": "Başvuru şikâyeti",
  "extraoral.softTissueProfile": "Yumuşak doku profili",
  "extraoral.upperIncisorDisplay": "Üst kesici görünümü",
  "dental.upperMidline": "Üst orta hat",
  "dental.lowerMidline": "Alt orta hat",
  "dental.overjetMm": "Overjet",
  "dental.overbiteMm": "Overbite",
  "dental.relationships": "Molar ve kanin ilişkileri",
  "dental.summaryMeasurements": "Dental ölçüm özeti",
  "spaceAnalysis.hn": "Hayes Nance sonuçları",
  "spaceAnalysis.bolton": "Bolton sonuçları",
  "growth.cervicalStage": "Servikal maturasyon yorumu",
  "radiographic.missingTeeth": "Eksik veya süpernümerer diş bulgusu",
  "radiographic.restorativeFindings": "Restoratif ve endodontik bulgular",
  "radiographic.tmjFinding": "TME bulgusu",
  "analysis.skeletal": "İskeletsel analiz özeti",
  "analysis.dental": "Dental analiz özeti",
  "plan.rows": "Problem, hedef ve plan satırları",
  "decision.bullets": "Vaka kararı",
};

const cephLabelById: Readonly<Record<string, string>> = {
  ceph_vertical: "Vertikal sefalometrik değerlendirme",
  ceph_sagittal: "Sagittal sefalometrik değerlendirme",
  ceph_incisor: "Kesici diş değerlendirmesi",
  ceph_soft_tissue: "Yumuşak doku değerlendirmesi",
};

function clinicalLabel(targetKey: string): string {
  const exact = clinicalLabelByKey[targetKey];
  if (exact !== undefined) return exact;
  if (targetKey.endsWith(".finding")) return "Klinik bulgu";
  const [category, semanticSlideId] = targetKey.split(".");
  if (category === "measurements") return cephLabelById[semanticSlideId ?? ""] ?? "Sefalometrik ölçümler";
  if (category === "interpretations") return cephLabelById[semanticSlideId ?? ""] ?? "Klinisyen yorumu";
  return "Eksik bilgi";
}

export function warningDisplayCopy(
  targetKey: string,
  sourceMessage: string,
): { readonly title: string; readonly detail: string } {
  const recordLabel = recordLabelById.get(targetKey);
  if (recordLabel !== undefined) {
    return {
      title: recordLabel,
      detail: "Bu slayt için gerekli görüntü henüz atanmadı.",
    };
  }
  return {
    title: clinicalLabel(targetKey),
    detail: sourceMessage.includes("onaylanmadı")
      ? "Bu yorum henüz klinisyen tarafından onaylanmadı."
      : "Bu slayt için gerekli bilgi henüz girilmedi.",
  };
}
