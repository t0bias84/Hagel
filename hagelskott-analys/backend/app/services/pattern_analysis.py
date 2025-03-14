import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
from dataclasses import dataclass
from scipy.spatial import ConvexHull
from sklearn.cluster import DBSCAN

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
        sensitivity: float = 0.5,
        pix_per_cm: float = 1.0
    ) -> Dict:
        """
        Huvudmetod:
         1) Justerar thresholds utifrån 'sensitivity'
         2) Om 'pix_per_cm' != 1 => skalar distanser => "riktigare" cm
        """

        try:
            if image is None or image.size == 0:
                logger.warning("Tom/ogiltig bild => return empty.")
                return self._create_empty_analysis()

            logger.info(f"[PatternAnalyzer] Start: sensitivity={sensitivity:.2f}, px/cm={pix_per_cm:.2f}")

            # Justera param beroende på 'sensitivity'
            self.min_shot_area = self.base_min_shot_area * (1.0 - 0.5 * sensitivity)
            self.max_shot_area = self.base_max_shot_area
            self.min_circularity = self.base_min_circularity - 0.1 * (sensitivity - 0.5)
            if self.min_circularity < 0:
                self.min_circularity = 0

            # 1) Förbehandling
            gray = self._to_grayscale(image)
            denoised = cv2.fastNlMeansDenoising(gray, h=10)

            # 2) Hitta ring (valfritt)
            ring_info = self._detect_ring(denoised)

            # 3) Tröska + morph
            adaptive_bin = cv2.adaptiveThreshold(
                denoised, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
                11, 2
            )
            kernel = np.ones((3,3), np.uint8)
            opened = cv2.morphologyEx(adaptive_bin, cv2.MORPH_OPEN, kernel)
            closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)

            # 4) findContours
            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            # 5) Filtrera
            valid_hits = self._filter_hits(contours)
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

    def _filter_hits(self, contours: List[np.ndarray]) -> List[Point]:
        valid = []
        for cnt in contours:
            area = float(cv2.contourArea(cnt))
            if self.min_shot_area <= area <= self.max_shot_area:
                perimeter = float(cv2.arcLength(cnt, True))
                circ = 0.0
                if perimeter > 0:
                    circ = float((4.0 * np.pi * area) / (perimeter ** 2))
                if circ > self.min_circularity:
                    M = cv2.moments(cnt)
                    if M["m00"] != 0:
                        cx = int(M["m10"] / M["m00"])
                        cy = int(M["m01"] / M["m00"])
                        valid.append(Point(cx, cy))
        return valid

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
