"""
Azure AI Foundry integration for commodity analysis.
Uses Kimi K2.6 model deployed on Azure AI Foundry.
"""
from openai import OpenAI
from src.config import get_config
from typing import Optional
import json
import structlog

logger = structlog.get_logger(__name__)


class AIAnalyzer:
    """
    Azure AI Foundry analyzer using Kimi K2.6.

    Provides:
    - Commodity trend analysis
    - Contract impact interpretation
    - Executive narrative generation
    - Risk assessment and recommendations
    """

    def __init__(self):
        cfg = get_config().azure_ai
        cfg.validate()

        self.client = OpenAI(
            base_url=cfg.endpoint,
            api_key=cfg.api_key
        )
        self.deployment = cfg.deployment
        logger.info("ai_analyzer_initialized", deployment=cfg.deployment)

    def _chat(self, system_prompt: str, user_content: str, temperature: float = 0.3) -> str:
        """Send a chat completion request to Kimi K2.6."""
        try:
            completion = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=temperature
            )
            return completion.choices[0].message.content
        except Exception as e:
            logger.error("ai_completion_failed", error=str(e))
            raise

    def analyze_trends(self, commodity_data: dict) -> str:
        """
        Analyze commodity price trends using Kimi K2.6.

        Args:
            commodity_data: Dict with commodity prices and metadata.

        Returns:
            AI-generated trend analysis narrative.
        """
        system_prompt = (
            "You are an expert commodity market analyst specializing in battery metals "
            "(Nickel, Cobalt, Lithium, MHP). Analyze the provided data and provide "
            "a concise but comprehensive trend summary covering:\n"
            "- Current price levels and recent movements\n"
            "- Key drivers and market context\n"
            "- Short-term outlook (next 30 days)\n"
            "- Risk factors to watch\n"
            "Use specific numbers and percentages."
        )

        user_content = (
            f"Analyze the following commodity price data:\n\n"
            f"```json\n{json.dumps(commodity_data, indent=2)}\n```"
        )

        return self._chat(system_prompt, user_content, temperature=0.3)

    def interpret_contracts(self, calculations: dict, prices: dict) -> str:
        """
        Generate executive-level interpretation of contract economics.

        Replaces the 'AI Model 1' (Financial Analyst) step from the original
        Airia flow with Azure AI Foundry's Kimi K2.6.

        Args:
            calculations: GLI business rule calculation results.
            prices: Current commodity prices.

        Returns:
            Executive narrative with contract performance analysis.
        """
        system_prompt = (
            "You are a Financial Analyst specialized in interpreting commodity contract "
            "economics for GLI (Global Lithium Innovations). You will receive structured "
            "calculation results containing:\n"
            "- Real-time commodity prices (Ni, Co, Li, MHP)\n"
            "- Calculated payables across multiple contract structures\n"
            "- Business insights and triggered conditions\n\n"
            "Structure your response as:\n"
            "- Executive Summary (2-3 sentences)\n"
            "- Current Market Conditions (commodity price snapshot)\n"
            "- Contract Performance Analysis (Black Mass, Primary Offtaker MHP, "
            "Li Carbonate, Li Cycle)\n"
            "- Key Insights & Triggers\n"
            "- Risk Exposure & Sensitivities\n"
            "- Recommendations\n\n"
            "Use specific numbers, percentages, and dollar amounts. Explain WHY specific "
            "provisions matter."
        )

        user_content = (
            f"## Current Commodity Prices\n```json\n{json.dumps(prices, indent=2)}\n```\n\n"
            f"## GLI Contract Calculations\n```json\n{json.dumps(calculations, indent=2)}\n```"
        )

        return self._chat(system_prompt, user_content, temperature=0.5)

    def assess_risk(self, portfolio_data: dict) -> str:
        """
        Assess risk exposure across GLI's commodity portfolio.

        Args:
            portfolio_data: Portfolio positions and contract exposures.

        Returns:
            Risk assessment narrative.
        """
        system_prompt = (
            "You are a risk analyst for a battery metals recycling company (GLI). "
            "Assess the risk exposure based on the provided portfolio data. Cover:\n"
            "- Price volatility exposure\n"
            "- Counterparty risk indicators\n"
            "- Regulatory risk factors\n"
            "- Concentration risk\n"
            "- Hedging recommendations\n"
            "Use a risk rating scale: LOW / MEDIUM / HIGH / CRITICAL for each category."
        )

        user_content = f"```json\n{json.dumps(portfolio_data, indent=2)}\n```"

        return self._chat(system_prompt, user_content, temperature=0.2)

    def generate_summary(self, all_results: dict) -> str:
        """
        Generate a comprehensive daily summary combining all analysis.

        Args:
            all_results: Combined results from all analysis modules.

        Returns:
            Daily briefing narrative.
        """
        system_prompt = (
            "You are the Chief Economist for GLI's recycling division. Generate a "
            "concise daily market briefing that a CFO can read in 2 minutes. Include:\n"
            "- Headline (one sentence)\n"
            "- Key Numbers (bullet points with the 3-5 most important figures)\n"
            "- Action Items (what commercial teams should do today)\n"
            "- Watch List (things to monitor over the next 48 hours)"
        )

        user_content = f"```json\n{json.dumps(all_results, indent=2)}\n```"

        return self._chat(system_prompt, user_content, temperature=0.4)
