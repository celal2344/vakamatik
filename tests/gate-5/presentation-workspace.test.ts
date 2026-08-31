import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  defaultWorkspaceUiState,
  type CaseView,
  type PresentationView,
} from "../../packages/desktop-contract/src/index.js";
import {
  DEFAULT_ALIGNMENT_STATE,
  DEFAULT_CLINICAL_DATA,
  DEFAULT_PRESENTATION_SETTINGS,
} from "../../packages/domain/src/index.js";
import { CaseSessionRegistry } from "../../apps/desktop/src/main/session-registry.js";
import { hitTestImageLayers } from "../../apps/desktop/src/renderer/presentation-hit-test.js";
import { warningDisplayCopy } from "../../apps/desktop/src/renderer/warning-copy.js";
import {
  consumeAlignmentArrow,
  rotationFromPointerDrag,
  setCropEdgePosition,
  shiftCropWindow,
  zoomCropWindow,
} from "../../apps/desktop/src/renderer/alignment-keyboard.js";
import { normalizedCoverCrop } from "../../apps/desktop/src/main/image-crop.js";

type Layer = PresentationView["slides"][number]["imageLayers"][number];
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

function layer(instanceId: string, zIndex: number, rotationDeg = 0): Layer {
  const transform = {
    translationXPt: 0,
    translationYPt: 0,
    uniformScale: 1,
    rotationDeg,
    opacity: 1,
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
  };
  return {
    instanceId,
    assetKey: instanceId,
    label: instanceId,
    linkGroup: null,
    availableLinkGroup: null,
    transform,
    defaultTransform: transform,
    bounds: { xPt: 100, yPt: 100, widthPt: 200, heightPt: 100 },
    zIndex,
  };
}

describe("presentation workspace", () => {
  test("renders missing record warnings with Turkish labels instead of internal keys", () => {
    expect(warningDisplayCopy("face_three_quarter_rest", "face_three_quarter_rest kaydı atanmadı.")).toEqual({
      title: "Sağ 45° — dinlenme",
      detail: "Bu slayt için gerekli görüntü henüz atanmadı.",
    });
  });

  test("renders clinical warnings without exposing internal field paths", () => {
    expect(warningDisplayCopy("patient.dateOfBirth", "Klinik içerik eksik.")).toEqual({
      title: "Doğum tarihi",
      detail: "Bu slayt için gerekli bilgi henüz girilmedi.",
    });
  });

  test("consumes keyboard arrows for alignment instead of allowing page scroll", () => {
    let prevented = false;
    const nudge = consumeAlignmentArrow(
      {
        key: "ArrowRight",
        shiftKey: false,
        altKey: false,
        preventDefault: () => {
          prevented = true;
        },
      },
      false,
    );
    expect(nudge).toEqual({ xPt: 0.5, yPt: 0 });
    expect(prevented).toBe(true);
  });

  test("moves the crop window without changing its size", () => {
    const shifted = shiftCropWindow({ left: 0.1, top: 0.2, right: 0.3, bottom: 0.1 }, 0.05, -0.05);
    expect(shifted).toEqual({ left: 0.15, top: 0.15, right: 0.25, bottom: 0.15 });
    expect(shifted.left + shifted.right).toBeCloseTo(0.4);
    expect(shifted.top + shifted.bottom).toBeCloseTo(0.3);
  });

  test("stops crop panning at an image edge without turning the extra movement into zoom", () => {
    const shifted = shiftCropWindow({ left: 0.1, top: 0, right: 0.2, bottom: 0.1 }, 0, -0.05);
    expect(shifted).toEqual({ left: 0.1, top: 0, right: 0.2, bottom: 0.1 });
  });

  test("materializes the crop hidden by cover placement", () => {
    expect(normalizedCoverCrop(800, 1200, 400, 300)).toEqual({
      left: 0,
      top: 0.25,
      right: 0,
      bottom: 0.25,
    });
  });

  test("direct crop edge input pans without changing the crop window size", () => {
    const crop = { left: 0, top: 0.25, right: 0, bottom: 0.25 };
    expect(setCropEdgePosition(crop, "top", 0.4)).toEqual({
      left: 0,
      top: 0.4,
      right: 0,
      bottom: 0.1,
    });
    expect(setCropEdgePosition(crop, "top", 0.6)).toEqual({
      left: 0,
      top: 0.5,
      right: 0,
      bottom: 0,
    });
  });

  test("zooms the crop explicitly while preserving its center", () => {
    const zoomed = zoomCropWindow({ left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }, 0.25);
    expect(zoomed).toEqual({ left: 0.18, top: 0.18, right: 0.18, bottom: 0.18 });
  });

  test("calculates fractional rotation across the angle wrap boundary", () => {
    expect(rotationFromPointerDrag(12.5, 175, -170)).toBe(27.5);
  });

  test("returns overlapping and rotated image layers front-to-back", () => {
    const hits = hitTestImageLayers([layer("back", 1, 32.5), layer("front", 8)], 200, 150);
    expect(hits.map((item) => item.instanceId)).toEqual(["front", "back"]);
    expect(hitTestImageLayers([layer("rotated", 1, 32.5)], 85, 85)).toHaveLength(0);
  });

  test("persists resumable UI state without exposing local paths", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "vakamatik-sessions-"));
    temporaryRoots.push(root);
    const userData = path.join(root, "user-data");
    const caseRoot = path.join(root, "cases", "synthetic-case");
    await mkdir(caseRoot, { recursive: true });
    await writeFile(path.join(caseRoot, "case.json"), "{}", "utf8");
    const now = new Date().toISOString();
    const caseView: CaseView = {
      caseId: "11111111-1111-4111-8111-111111111111",
      revision: 0,
      title: "Synthetic Session",
      folderName: "synthetic-case",
      createdAt: now,
      updatedAt: now,
      assets: {},
      assignments: {},
      clinical: DEFAULT_CLINICAL_DATA,
      presentation: DEFAULT_PRESENTATION_SETTINGS,
      alignment: DEFAULT_ALIGNMENT_STATE,
    };
    const registry = new CaseSessionRegistry(userData);
    await registry.register(caseRoot, caseView);
    await registry.saveUiState(caseView.caseId, {
      ...defaultWorkspaceUiState,
      tab: "presentation",
      selectedSlideId: "ceph_profile_overlay",
    });

    const sessions = await registry.list();
    expect(sessions[0]).toMatchObject({
      caseId: caseView.caseId,
      available: true,
      uiState: { tab: "presentation", selectedSlideId: "ceph_profile_overlay" },
    });
    expect(sessions[0]).not.toHaveProperty("root");
    expect(await registry.rootFor(caseView.caseId)).toBe(path.resolve(caseRoot));

    await registry.forget(caseView.caseId);
    expect(await registry.list()).toEqual([]);
  });
});
