import cv2
import numpy as np
from typing import Tuple, Optional, Dict
import logging
from pathlib import Path
import io
from datetime import datetime
from PIL import Image, ImageEnhance
from app.core.config import settings

# Konfigurera logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageProcessor:
    def __init__(self):
        self.blur_kernel_size = settings.BLUR_KERNEL_SIZE
        self.adaptive_block_size = settings.ADAPTIVE_BLOCK_SIZE
        self.adaptive_c = settings.ADAPTIVE_C
        self.target_size = (800, 800)  # Standardstorlek för bearbetade bilder

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Förbehandla bild för träffmönsteranalys
        
        Args:
            image: OpenCV bild (numpy array)
            
        Returns:
            Förbehandlad bild
        """
        try:
            # Kontrollera om bilden är tom eller ogiltig
            if image is None or image.size == 0:
                raise ValueError("Ogiltig eller tom bild")

            # Skala om bilden om den är för stor
            image = self._resize_image(image)

            # Konvertera till gråskala om bilden är i färg
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()

            # Förbättra kontrast
            enhanced = self._enhance_contrast(gray)

            # Brusreducering
            denoised = cv2.fastNlMeansDenoising(
                enhanced,
                None,
                h=10,
                templateWindowSize=7,
                searchWindowSize=21
            )

            # Adaptiv histogramutjämning
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            equalized = clahe.apply(denoised)

            # Gaussisk oskärpa för att reducera brus ytterligare
            blurred = cv2.GaussianBlur(
                equalized,
                self.blur_kernel_size,
                0
            )

            return blurred

        except Exception as e:
            logger.error(f"Error in image preprocessing: {str(e)}")
            raise

    def save_processed_image(
        self,
        image: np.ndarray,
        filename: str,
        user_id: str
    ) -> Dict[str, str]:
        """
        Spara original och bearbetad bild
        
        Returns:
            Dictionary med sökvägar till sparade bilder
        """
        try:
            # Skapa mappar för användarens bilder
            base_path = settings.UPLOAD_DIR / str(user_id)
            base_path.mkdir(parents=True, exist_ok=True)

            # Generera filnamn med timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_filename = f"{timestamp}_{filename}"

            # Spara original
            original_path = base_path / f"original_{base_filename}"
            cv2.imwrite(str(original_path), image)

            # Spara bearbetad version
            processed_path = base_path / f"processed_{base_filename}"
            processed_image = self.preprocess_image(image)
            cv2.imwrite(str(processed_path), processed_image)

            return {
                "original": str(original_path),
                "processed": str(processed_path)
            }

        except Exception as e:
            logger.error(f"Error saving images: {str(e)}")
            raise

    def extract_region_of_interest(
        self,
        image: np.ndarray,
        target_size: Optional[Tuple[int, int]] = None
    ) -> np.ndarray:
        """
        Extrahera och beskär relevant område av bilden
        """
        try:
            # Använd standardstorlek om ingen anges
            if target_size is None:
                target_size = self.target_size

            # Konvertera till gråskala för konturdetektering
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

            # Tröskling för att hitta huvudområdet
            _, binary = cv2.threshold(
                gray,
                0,
                255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )

            # Hitta konturer
            contours, _ = cv2.findContours(
                binary,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )

            if not contours:
                return image

            # Hitta största konturen
            main_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(main_contour)

            # Lägg till marginal
            margin = 50
            x = max(0, x - margin)
            y = max(0, y - margin)
            w = min(image.shape[1] - x, w + 2 * margin)
            h = min(image.shape[0] - y, h + 2 * margin)

            # Beskär bilden
            roi = image[y:y+h, x:x+w]

            # Skala om till målstorlek
            return cv2.resize(roi, target_size)

        except Exception as e:
            logger.error(f"Error extracting ROI: {str(e)}")
            return image

    def _resize_image(self, image: np.ndarray) -> np.ndarray:
        """
        Skala om bilden om den är för stor
        """
        max_dimension = 1600
        height, width = image.shape[:2]

        if max(height, width) > max_dimension:
            scale = max_dimension / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            return cv2.resize(image, (new_width, new_height))

        return image

    def _enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """
        Förbättra bildkontrast
        """
        # Konvertera till PIL Image för kontrastförbättring
        pil_image = Image.fromarray(image)
        enhancer = ImageEnhance.Contrast(pil_image)
        enhanced_pil = enhancer.enhance(1.5)  # Öka kontrasten med 50%
        
        # Konvertera tillbaka till numpy array
        return np.array(enhanced_pil)

    def analyze_image_quality(self, image: np.ndarray) -> Dict[str, float]:
        """
        Analysera bildkvalitet
        """
        try:
            # Beräkna olika kvalitetsmått
            blur_score = self._calculate_blur_score(image)
            contrast_score = self._calculate_contrast_score(image)
            noise_score = self._calculate_noise_score(image)

            return {
                "blur_score": blur_score,
                "contrast_score": contrast_score,
                "noise_score": noise_score,
                "overall_quality": (blur_score + contrast_score + noise_score) / 3
            }

        except Exception as e:
            logger.error(f"Error analyzing image quality: {str(e)}")
            return {
                "blur_score": 0.0,
                "contrast_score": 0.0,
                "noise_score": 0.0,
                "overall_quality": 0.0
            }

    def _calculate_blur_score(self, image: np.ndarray) -> float:
        """
        Beräkna suddighetspoäng med Laplacian varians
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        # Normalisera till 0-1 skala
        return min(1.0, laplacian_var / 1000.0)

    def _calculate_contrast_score(self, image: np.ndarray) -> float:
        """
        Beräkna kontrastpoäng
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        histogram = cv2.calcHist([gray], [0], None, [256], [0, 256])
        histogram = histogram.flatten() / histogram.sum()
        cumsum = histogram.cumsum()
        
        # Hitta 10:e och 90:e percentilen
        for i, cum in enumerate(cumsum):
            if cum > 0.1:
                p10 = i
                break
        for i, cum in enumerate(cumsum):
            if cum > 0.9:
                p90 = i
                break

        # Normalisera kontrasten till 0-1 skala
        return min(1.0, (p90 - p10) / 255.0)

    def _calculate_noise_score(self, image: np.ndarray) -> float:
        """
        Beräkna bruspoäng
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Använd medianfilter som referens
        denoised = cv2.medianBlur(gray, 3)
        noise = cv2.absdiff(gray, denoised)
        noise_level = np.mean(noise)
        
        # Normalisera till 0-1 skala (inverterad, där 1 betyder minst brus)
        return max(0.0, 1.0 - (noise_level / 50.0))

# Skapa en global instans av ImageProcessor
image_processor = ImageProcessor()