import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Point:
    x: float
    y: float

class PatternAnalyzer:
    """
    PatternAnalyzer
    --------------
    Bevarar tidigare funktioner men nu med:
     - sensitivity (0..1)
     - pix_per_cm (kalibrering)
    Inget borttaget, alla metoder/parametrar finns kvar.
    """

    def __init__(self):
        self.base_min_shot_area = 1.0
        self.base_max_shot_area = 2500.0
        self.base_min_circularity = 0.2

        # Ring-detektering
        self.min_ring_radius_px = 20
        self.max_ring_radius_px = 2000
        self.hough_dp = 1.2
        self.hough_param1 = 100
        self.hough_param2 = 30
        self.hough_min_dist = 100

    def analyze_shot_pattern(
        self,
        image: np.ndarray,
        pix_per_cm: float = 1.0,
        min_area: float = 5.0,
        max_area: float = 100.0,
        min_circularity: float = 0.6
    ) -> Dict:
        """
        Huvudmetod:
         - Använder nu direkta parametrar för blob detection.
         - 'sensitivity' är borttagen till förmån för min_area, max_area, etc.
        """

        try:
            if image is None or image.size == 0:
                logger.warning("Tom/ogiltig bild => return empty.")
                return self._create_empty_analysis()

            logger.info(f"[PatternAnalyzer] Start: pix/cm={pix_per_cm:.2f}, min_area={min_area}, max_area={max_area}, min_circ={min_circularity}")

            # 1) Förbehandling
            gray = self._to_grayscale(image)
            denoised = cv2.fastNlMeansDenoising(gray, h=10)

            # 2) Hitta ring (valfritt)
            ring_info = self._detect_ring(denoised)

            # 3) Hitta träffar med den nya hjälpfunktionen
            valid_hits = self._detect_hits(
                denoised,
                min_area=min_area,
                max_area=max_area,
                min_circularity=min_circularity
            )
            if not valid_hits:
                empty_analysis = self._create_empty_analysis()
                if ring_info:
                    empty_analysis["ring"] = ring_info
                return empty_analysis

            centroid, dists = self._calculate_pattern_center(valid_hits)
            height, width = image.shape[:2]

            # scale_factor => 1 / pix_per_cm
            scale_factor = 1.0 / pix_per_cm if pix_per_cm > 0 else 1.0

            # Pellets
            pellets = self._build_individual_pellets(valid_hits, centroid, width, height, scale_factor)

            # pattern_radius, density
            pattern_radius, density = self._compute_pattern_stats(valid_hits, dists, scale_factor)

            # zone, distribution
            zone_density = self._calculate_zone_density(valid_hits, centroid)
            distribution = self._calculate_distribution(valid_hits, centroid)
            closest_hits = self._find_closest_hits(valid_hits, centroid)
            outer_hits = self._find_outer_hits(valid_hits, centroid)

            analysis_results = {
                "hit_count": len(valid_hits),
                "pattern_density": round(density, 4),
                "centroid": {
                    "x": float(centroid[0] / width * 100),
                    "y": float(centroid[1] / height * 100)
                },
                "spread": float(np.std(dists) * scale_factor),
                "pattern_radius": float(pattern_radius),
                "zone_analysis": zone_density,
                "distribution": distribution,
                "closest_hits": closest_hits,
                "outer_hits": outer_hits,
                "individual_pellets": pellets,
                "image_dimensions": {"width": width, "height": height},
                "ring": ring_info if ring_info else {},
            }

            # Beräkna Pattern Score
            analysis_results["pattern_score"] = self._calculate_pattern_score(analysis_results)

            return analysis_results

        except Exception as e:
            logger.error(f"analyze_shot_pattern => {e}", exc_info=True)
            return self._create_empty_analysis()

    def _to_grayscale(self, image: np.ndarray) -> np.ndarray:
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image

    def _detect_ring(self, gray_image: np.ndarray) -> Dict[str, float]:
        blurred = cv2.GaussianBlur(gray_image, (9, 9), 2)
        circles = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=self.hough_dp,
            minDist=self.hough_min_dist,
            param1=self.hough_param1,
            param2=self.hough_param2,
            minRadius=self.min_ring_radius_px,
            maxRadius=self.max_ring_radius_px
        )
        if circles is not None and len(circles) > 0:
            circles = np.round(circles[0, :]).astype(int)
            best_circle = sorted(circles, key=lambda c: c[2], reverse=True)[0]
            cx, cy, r = best_circle
            return {
                "centerX": float(cx),
                "centerY": float(cy),
                "radius_px": float(r),
                "confidence": 0.9
            }
        return {}

    def preview_hits(
        self,
        image: np.ndarray,
        min_area: float,
        max_area: float,
        min_circularity: float
    ) -> List[Point]:
        """
        Public method to get a preview of detected hits without a full analysis.
        """
        gray = self._to_grayscale(image)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        return self._detect_hits(denoised, min_area, max_area, min_circularity)

    def _detect_hits(
        self,
        gray_image: np.ndarray,
        min_area: float,
        max_area: float,
        min_circularity: float
    ) -> List[Point]:
        """
        Encapsulates the logic for detecting hits using SimpleBlobDetector.
        """
        # Tröska + morph
        adaptive_bin = cv2.adaptiveThreshold(
            gray_image, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
            11, 2
        )
        kernel = np.ones((3,3), np.uint8)
        opened = cv2.morphologyEx(adaptive_bin, cv2.MORPH_OPEN, kernel)
        closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)

        # Blob Detection
        params = cv2.SimpleBlobDetector_Params()

        params.filterByArea = True
        params.minArea = min_area
        params.maxArea = max_area

        params.filterByCircularity = True
        params.minCircularity = min_circularity

        params.filterByConvexity = True
        params.minConvexity = 0.85

        params.filterByInertia = True
        params.minInertiaRatio = 0.1

        detector = cv2.SimpleBlobDetector_create(params)

        inverted_image = cv2.bitwise_not(closed)
        keypoints = detector.detect(inverted_image)

        return [Point(kp.pt[0], kp.pt[1]) for kp in keypoints]

    def _calculate_pattern_center(
        self,
        hits: List[Point]
    ) -> Tuple[np.ndarray, np.ndarray]:
        arr = np.array([[p.x, p.y] for p in hits], dtype=np.float32)
        centroid = np.mean(arr, axis=0)
        distances = np.linalg.norm(arr - centroid, axis=1)
        return centroid, distances

    def _build_individual_pellets(
        self,
        hits: List[Point],
        centroid: np.ndarray,
        width: int,
        height: int,
        scale_factor: float
    ) -> List[Dict[str, float]]:
        pellets = []
        cx, cy = centroid
        for h in hits:
            dx = (h.x - cx) * scale_factor
            dy = (h.y - cy) * scale_factor
            dist = float(np.sqrt(dx**2 + dy**2))
            pellets.append({
                "x": round((h.x / width) * 100, 2),
                "y": round((h.y / height) * 100, 2),
                "distance_from_center": round(dist, 2)
            })
        return pellets

    def _compute_pattern_stats(
        self,
        hits: List[Point],
        distances: np.ndarray,
        scale_factor: float
    ) -> Tuple[float, float]:
        if not hits:
            return (0.0, 0.0)
        max_dist = float(np.max(distances)) * scale_factor
        area = np.pi * (max_dist ** 2)
        if area > 0:
            density = len(hits) / area
        else:
            density = 0.0
        return (max_dist, density)

    def _calculate_zone_density(
        self,
        hits: List[Point],
        center: np.ndarray
    ) -> Dict[str, Dict]:
        if not hits:
            return {
                "inner": {"radius": 100, "hits": 0, "pellets": [], "percentage": 0},
                "middle": {"radius": 200, "hits": 0, "pellets": [], "percentage": 0},
                "outer": {"radius": 300, "hits": 0, "pellets": [], "percentage": 0},
                "extreme": {"radius": 9999, "hits": 0, "pellets": [], "percentage": 0}
            }

        zones = {
            "inner":   {"radius": 100,  "hits": 0, "pellets": []},
            "middle":  {"radius": 200,  "hits": 0, "pellets": []},
            "outer":   {"radius": 300,  "hits": 0, "pellets": []},
            "extreme": {"radius": 9999, "hits": 0, "pellets": []}
        }
        arr = np.array([[p.x, p.y] for p in hits], dtype=np.float32)
        dists = np.linalg.norm(arr - center, axis=1)
        total = len(hits)

        for i, d in enumerate(dists):
            px = float(arr[i][0])
            py = float(arr[i][1])
            if d <= zones["inner"]["radius"]:
                zones["inner"]["hits"] += 1
                zones["inner"]["pellets"].append({"x": px, "y": py})
            elif d <= zones["middle"]["radius"]:
                zones["middle"]["hits"] += 1
                zones["middle"]["pellets"].append({"x": px, "y": py})
            elif d <= zones["outer"]["radius"]:
                zones["outer"]["hits"] += 1
                zones["outer"]["pellets"].append({"x": px, "y": py})
            else:
                zones["extreme"]["hits"] += 1
                zones["extreme"]["pellets"].append({"x": px, "y": py})

        for k in zones:
            z = zones[k]
            if total > 0:
                z["percentage"] = round(z["hits"] / total * 100, 2)
            else:
                z["percentage"] = 0
        return zones

    def _calculate_distribution(
        self,
        hits: List[Point],
        center: np.ndarray
    ) -> Dict[str, Dict]:
        distros = {
            "top_left": {"count": 0, "pellets": []},
            "top_right": {"count": 0, "pellets": []},
            "bottom_left": {"count": 0, "pellets": []},
            "bottom_right": {"count": 0, "pellets": []}
        }
        cx, cy = center
        for p in hits:
            dx = p.x - cx
            dy = p.y - cy
            px = float(p.x)
            py = float(p.y)

            if dy < 0:  # top
                if dx < 0:
                    distros["top_left"]["count"] += 1
                    distros["top_left"]["pellets"].append({"x": px, "y": py})
                else:
                    distros["top_right"]["count"] += 1
                    distros["top_right"]["pellets"].append({"x": px, "y": py})
            else:
                if dx < 0:
                    distros["bottom_left"]["count"] += 1
                    distros["bottom_left"]["pellets"].append({"x": px, "y": py})
                else:
                    distros["bottom_right"]["count"] += 1
                    distros["bottom_right"]["pellets"].append({"x": px, "y": py})
        return distros

    def _find_closest_hits(
        self,
        hits: List[Point],
        center: np.ndarray,
        n: int = 5
    ) -> List[Dict[str, float]]:
        if not hits:
            return []
        arr = np.array([[p.x, p.y] for p in hits], dtype=np.float32)
        dists = np.linalg.norm(arr - center, axis=1)
        idx_sorted = np.argsort(dists)[:n]
        ret = []
        for i in idx_sorted:
            ret.append({
                "x": float(arr[i][0]),
                "y": float(arr[i][1]),
                "distance": float(dists[i])
            })
        return ret

    def _find_outer_hits(
        self,
        hits: List[Point],
        center: np.ndarray,
        n: int = 5
    ) -> List[Dict[str, float]]:
        if not hits:
            return []
        arr = np.array([[p.x, p.y] for p in hits], dtype=np.float32)
        dists = np.linalg.norm(arr - center, axis=1)
        idx_sorted = np.argsort(dists)[-n:]
        ret = []
        for i in idx_sorted:
            ret.append({
                "x": float(arr[i][0]),
                "y": float(arr[i][1]),
                "distance": float(dists[i])
            })
        return ret

    def _calculate_pattern_score(self, analysis_results: Dict) -> float:
        """
        Beräknar ett "Pattern Score" (0-100) baserat på analysresultaten.
        Viktning:
        - 40% Spridning (spread)
        - 30% Centrering (avstånd från centrum)
        - 20% Densitet i kärnan (inner zone)
        - 10% Jämnhet (distribution)
        """
        if not analysis_results or analysis_results["hit_count"] == 0:
            return 0.0

        # --- 1. Spridnings-score (lägre är bättre) ---
        # Normalisera: spread på 0 -> 100p, spread på 200 -> 0p
        max_spread = 200.0  # Justerbar parameter
        spread = analysis_results.get("spread", max_spread)
        spread_score = max(0, 100 * (1 - (spread / max_spread)))

        # --- 2. Centrerings-score (närmare mitten är bättre) ---
        centroid = analysis_results.get("centroid", {"x": 50, "y": 50})
        # Avstånd från bildens mitt (50, 50)
        dist_from_center = np.sqrt((centroid["x"] - 50)**2 + (centroid["y"] - 50)**2)
        # Normalisera: dist 0 -> 100p, dist 25 -> 0p (25% av bilden)
        max_dist = 25.0
        centering_score = max(0, 100 * (1 - (dist_from_center / max_dist)))

        # --- 3. Densitet-score (högre i "inner" zon är bättre) ---
        inner_zone_perc = analysis_results.get("zone_analysis", {}).get("inner", {}).get("percentage", 0)
        # Normalisera: 50% i innersta zonen ger max poäng
        target_perc = 50.0
        density_score = min(100, 100 * (inner_zone_perc / target_perc))

        # --- 4. Jämnhets-score (jämnare fördelning är bättre) ---
        distribution = analysis_results.get("distribution", {})
        counts = [dist.get("count", 0) for dist in distribution.values()]
        total_hits = sum(counts)
        if total_hits > 0:
            percentages = [c / total_hits for c in counts]
            # Perfekt fördelning = [0.25, 0.25, 0.25, 0.25]. Varians = 0.
            # Max varians för 4 element (1, 0, 0, 0) är 0.1875
            variance = np.var(percentages)
            max_variance = 0.1875
            evenness_score = max(0, 100 * (1 - (variance / max_variance)))
        else:
            evenness_score = 0


        # --- Total Score (viktad) ---
        total_score = (
            spread_score * 0.40 +
            centering_score * 0.30 +
            density_score * 0.20 +
            evenness_score * 0.10
        )

        return round(total_score, 2)


    def _create_empty_analysis(self) -> Dict:
        return {
            "hit_count": 0,
            "pattern_density": 0.0,
            "centroid": {"x": 0.0, "y": 0.0},
            "spread": 0.0,
            "pattern_radius": 0.0,
            "zone_analysis": {
                "inner": {"radius": 100, "hits": 0, "pellets": [], "percentage": 0},
                "middle": {"radius": 200, "hits": 0, "pellets": [], "percentage": 0},
                "outer": {"radius": 300, "hits": 0, "pellets": [], "percentage": 0},
                "extreme": {"radius": 9999, "hits": 0, "pellets": [], "percentage": 0}
            },
            "distribution": {
                "top_left": {"count": 0, "pellets": []},
                "top_right": {"count": 0, "pellets": []},
                "bottom_left": {"count": 0, "pellets": []},
                "bottom_right": {"count": 0, "pellets": []}
            },
            "closest_hits": [],
            "outer_hits": [],
            "individual_pellets": [],
            "image_dimensions": {"width": 0, "height": 0},
            "ring": {}
        }

    @staticmethod
    def calculate_pattern_similarity(patterns: List[Dict]) -> float:
        """
        En enkel "likhets"-beräkning via variance i density/hit_count.
        """
        import numpy as np
        if len(patterns) < 2:
            return 1.0

        densities = [p["analysis_results"].get("pattern_density", 0.0) for p in patterns]
        hit_counts = [p["analysis_results"].get("hit_count", 0) for p in patterns]

        density_var = np.var(densities)
        hit_var = np.var(hit_counts)

        max_density_var = 100.0
        avg_hit = float(np.mean(hit_counts)) if hit_counts else 1.0
        max_hit_var = (avg_hit**2) if avg_hit > 0 else 1.0

        norm_var = (density_var / max_density_var + hit_var / max_hit_var) / 2.0
        sim = 1.0 - min(norm_var, 1.0)
        return round(sim, 4)
