// DebugScript.jsx
import React, { useEffect } from "react";

/**
 * DebugScript – Extra utförlig variant
 * -------------------------------------
 *
 * Loggar i console varenda liten detalj kring:
 *   - fetchUrl, routeProps, rawData
 *   - analysisData i sin helhet
 *   - eventuellt sista patchRequest/patchError (om man skickar in dem)
 */
export default function DebugScript({
  analysisData,
  fetchUrl = null,
  rawData = null,
  routeProps = {},
  lastPatchRequest = null,  // <--- Ny prop (valfri)
  lastPatchError = null     // <--- Ny prop (valfri)
}) {
  useEffect(() => {
    console.group("=== [UltraDebugScript] START ===");

    // 1. fetchUrl
    if (fetchUrl) {
      console.log("[UltraDebugScript] fetchUrl =>", fetchUrl);
    } else {
      console.warn("[UltraDebugScript] Ingen fetchUrl angiven? (Kan vara OK).");
    }

    // 2. routeProps
    if (Object.keys(routeProps).length > 0) {
      console.log("[UltraDebugScript] routeProps =>", routeProps);
    } else {
      console.warn("[UltraDebugScript] routeProps är tom => (ex: shotId, userId?).");
    }

    // 3. rawData
    if (rawData) {
      console.log("[UltraDebugScript] rawData (JSON) =>\n", JSON.stringify(rawData, null, 2));
    } else {
      console.warn("[UltraDebugScript] Ingen rawData => (Kanske inte skickad från container).");
    }

    // 4. analysisData
    console.log("[UltraDebugScript] analysisData (JSON) =>\n", JSON.stringify(analysisData, null, 2));
    console.log("[UltraDebugScript] analysisData => ", analysisData);

    // 5. imageUrl?
    if (analysisData?.imageUrl) {
      console.log("[UltraDebugScript] VI HAR 'imageUrl' =>", analysisData.imageUrl);
    } else {
      console.warn("[UltraDebugScript] Ingen 'imageUrl' => (analysisData.imageUrl saknas).");
    }

    // 6. hits
    if (Array.isArray(analysisData?.hits) && analysisData.hits.length > 0) {
      console.log(`[UltraDebugScript] hits-längd: ${analysisData.hits.length}`);
    } else {
      console.warn("[UltraDebugScript] hits är tom => (analysisData.hits = [])");
    }

    // 7. ring
    if (analysisData?.ring) {
      console.log("[UltraDebugScript] ring =>", analysisData.ring);
    } else {
      console.warn("[UltraDebugScript] Ingen ring => analysisData.ring = null?");
    }

    // 8. metadata
    if (analysisData?.metadata) {
      console.log("[UltraDebugScript] metadata => ", analysisData.metadata);
      console.log("[UltraDebugScript] centerOfMass => ", analysisData.metadata.centerOfMass);
      console.log("[UltraDebugScript] hitCount =>", analysisData.metadata.hitCount);
      console.log("[UltraDebugScript] patternDensity =>", analysisData.metadata.patternDensity);
    } else {
      console.warn("[UltraDebugScript] Ingen metadata => analysisData.metadata saknas?");
    }

    // 9. densityData
    if (Array.isArray(analysisData?.densityData) && analysisData.densityData.length > 0) {
      console.log("[UltraDebugScript] densityData =>", analysisData.densityData);
    } else {
      console.warn("[UltraDebugScript] densityData är tom eller saknas.");
    }

    // 10. distribution, zoneAnalysis, clusters
    console.log("[UltraDebugScript] distribution =>", analysisData.distribution);
    console.log("[UltraDebugScript] zoneAnalysis =>", analysisData.zoneAnalysis);
    console.log("[UltraDebugScript] clusters =>", analysisData.clusters);

    // 11. rawData.analysis_results
    if (rawData?.analysis_results) {
      console.log("[UltraDebugScript] rawData.analysis_results =>", rawData.analysis_results);
      if (!rawData.analysis_results.individual_pellets) {
        console.warn("[UltraDebugScript] rawData.analysis_results.individual_pellets saknas helt i rawData!");
      } else if (
        !Array.isArray(rawData.analysis_results.individual_pellets) ||
        rawData.analysis_results.individual_pellets.length === 0
      ) {
        console.warn("[UltraDebugScript] rawData.analysis_results.individual_pellets är tom array!");
      } else {
        console.log(`[UltraDebugScript] rawData.analysis_results.individual_pellets => ${rawData.analysis_results.individual_pellets.length} st pellets`);
      }
    } else {
      console.warn("[UltraDebugScript] Ingen analysis_results i rawData? => rutan.");
    }

    // 12. analysisData.analysis_results
    if (!analysisData?.analysis_results) {
      console.warn("[UltraDebugScript] Ingen 'analysis_results' på analysisData => Du kanske inte speglar det i formatAnalysisData?");
    } else {
      console.log("[UltraDebugScript] analysisData.analysis_results =>", analysisData.analysis_results);
      if (Array.isArray(analysisData.analysis_results.individual_pellets)) {
        console.log("[UltraDebugScript] analysisData.analysis_results.individual_pellets =>", analysisData.analysis_results.individual_pellets);
      } else {
        console.warn("[UltraDebugScript] analysisData.analysis_results.individual_pellets saknas/tom?");
      }
    }

    // 13. PATCH-diagnostics (nytt)
    if (lastPatchRequest) {
      console.log("[UltraDebugScript] lastPatchRequest =>", lastPatchRequest);
    } else {
      console.warn("[UltraDebugScript] Ingen lastPatchRequest => (Kanske ej patchad ännu?)");
    }
    if (lastPatchError) {
      console.error("[UltraDebugScript] lastPatchError =>", lastPatchError);
    }

    // 14. Avslut
    console.groupEnd();
  }, [analysisData, fetchUrl, rawData, routeProps, lastPatchRequest, lastPatchError]);

  return null;
}
