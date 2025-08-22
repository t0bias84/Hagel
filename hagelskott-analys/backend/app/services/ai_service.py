import logging
from typing import Dict, Optional
from openai import OpenAI, OpenAIError
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY is not configured. AI Service will be disabled.")
            self.client = None
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_analysis_insights(self, analysis_results: Dict) -> Optional[str]:
        if not self.client:
            return None

        try:
            prompt = self._build_prompt(analysis_results)

            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant and an expert in shotgun ballistics and pattern analysis. Your role is to analyze shotgun pattern data and provide a clear, concise, and helpful summary for an amateur shooter. Provide the analysis in Swedish."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=500,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0,
            )

            return response.choices[0].message.content.strip()

        except OpenAIError as e:
            logger.error(f"An error occurred with the OpenAI API: {e}")
            return "AI analysis could not be performed due to an API error."
        except Exception as e:
            logger.error(f"An unexpected error occurred in AIService: {e}")
            return "An unexpected error occurred during AI analysis."

    def _build_prompt(self, results: Dict) -> str:
        # Extracting key metrics from the analysis results
        score = results.get('pattern_score', 'N/A')
        hit_count = results.get('hit_count', 'N/A')
        spread = f"{results.get('spread', 0):.2f}"
        density = f"{results.get('pattern_density', 0):.4f}"
        centroid_x = f"{results.get('centroid', {}).get('x', 0):.1f}%"
        centroid_y = f"{results.get('centroid', {}).get('y', 0):.1f}%"

        # Zone analysis
        inner_zone = results.get('zone_analysis', {}).get('inner', {})
        inner_hits = inner_zone.get('hits', 0)
        inner_perc = f"{inner_zone.get('percentage', 0):.1f}%"

        # Distribution
        distribution = results.get('distribution', {})
        tl = distribution.get('top_left', {}).get('count', 0)
        tr = distribution.get('top_right', {}).get('count', 0)
        bl = distribution.get('bottom_left', {}).get('count', 0)
        br = distribution.get('bottom_right', {}).get('count', 0)

        prompt = f"""
        Here is the data from a shotgun pattern analysis. Please provide a helpful summary and actionable advice for the user. The user is likely an amateur hunter or sport shooter.

        **Key Metrics:**
        - **Overall Pattern Score:** {score} / 100
        - **Total Pellet Hits:** {hit_count}
        - **Pattern Spread (Standard Deviation):** {spread} cm
        - **Pattern Density:** {density} hits/cm²
        - **Pattern Center (Centroid):** X: {centroid_x}, Y: {centroid_y} (from top-left corner)

        **Zone Analysis (hits within central circle):**
        - **Hits in Inner Zone:** {inner_hits} ({inner_perc} of total)

        **Quadrant Distribution (from pattern center):**
        - **Top-Left:** {tl} hits
        - **Top-Right:** {tr} hits
        - **Bottom-Left:** {bl} hits
        - **Bottom-Right:** {br} hits

        **Your Task:**
        1.  **Summarize the Pattern:** In a few sentences, describe the overall quality of this pattern. Is it tight or open? Is it well-centered? Is the distribution even?
        2.  **Give Practical Insights:** Based on the data, what does this mean in a practical sense? For example, is this pattern good for long-range targets, or is it better suited for close-range? Is there a noticeable bias in the pattern's placement?
        3.  **Provide Actionable Advice:** Suggest one or two concrete things the user could try to improve their results or adapt this load for a different purpose. For example, suggest trying a different choke, adjusting their aim, or using a different shot size.

        Please write the response in a friendly, encouraging, and easy-to-understand tone.
        """
        return prompt

ai_service = AIService()
