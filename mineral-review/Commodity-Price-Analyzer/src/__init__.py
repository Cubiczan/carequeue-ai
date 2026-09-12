"""
Main pipeline orchestrator for Commodity Price Analyzer.
Coordinates data fetching, contract calculations, AI analysis, and Fabric storage.
"""
import json
import sys
from datetime import datetime
from typing import Optional
import structlog

from src.config import get_config
from src.data.fetcher import CommodityDataFetcher
from src.contracts.business_rules import run_all_calculations
from src.ai.analyzer import AIAnalyzer
from src.fabric.client import FabricClient

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
    ]
)

logger = structlog.get_logger(__name__)


class CommodityPipeline:
    """
    End-to-end commodity analysis pipeline.

    Flow:
    1. Fetch real-time commodity prices
    2. Run GLI business rule calculations
    3. Generate AI-powered analysis via Kimi K2.6
    4. Store results in Fabric Lakehouse
    5. Return comprehensive results
    """

    def __init__(self):
        self.fetcher = CommodityDataFetcher()
        self.ai = AIAnalyzer()
        self.fabric = FabricClient()
        logger.info("pipeline_initialized")

    def run(self, metals: Optional[list] = None, skip_ai: bool = False) -> dict:
        """
        Execute the full analysis pipeline.

        Args:
            metals: List of metals to analyze. Defaults to Ni, Co, Li.
            skip_ai: If True, skip AI analysis (for testing or speed).

        Returns:
            Complete pipeline results including prices, calculations, and AI insights.
        """
        start_time = datetime.utcnow()
        logger.info("pipeline_start", metals=metals)

        # Step 1: Fetch commodity prices
        logger.info("step_1_fetching_prices")
        prices = self.fetcher.fetch_all_metals(metals)

        if not prices:
            logger.error("no_prices_fetched")
            return {"error": "Failed to fetch any commodity prices"}

        # Extract raw prices for calculations
        raw_prices = {
            "nickel": prices.get("nickel", {}).get("price", 18000),
            "cobalt": prices.get("cobalt", {}).get("price", 35000),
            "lithium": prices.get("lithium", {}).get("price", 25000),
        }

        # Step 2: Run GLI contract calculations
        logger.info("step_2_running_calculations")
        calculations = run_all_calculations(raw_prices)

        # Step 3: Generate AI analysis (if enabled)
        ai_results = {}
        if not skip_ai:
            try:
                logger.info("step_3_running_ai_analysis")
                ai_results["trend_analysis"] = self.ai.analyze_trends(prices)
                ai_results["contract_interpretation"] = self.ai.interpret_contracts(
                    calculations["gli_calculations"],
                    raw_prices
                )
                ai_results["risk_assessment"] = self.ai.assess_risk({
                    "positions": calculations["gli_calculations"],
                    "prices": raw_prices,
                })
            except Exception as e:
                logger.error("ai_analysis_failed", error=str(e))
                ai_results["error"] = str(e)

        # Step 4: Store in Fabric Lakehouse
        logger.info("step_4_storing_results")
        fabric_status = self._store_results(prices, calculations, ai_results)

        # Compile final results
        end_time = datetime.utcnow()
        results = {
            "pipeline_run": {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": (end_time - start_time).total_seconds(),
                "status": "success",
            },
            "commodity_prices": prices,
            "gli_calculations": calculations["gli_calculations"],
            "unit_conversions": calculations["unit_conversions"],
            "business_insights": calculations["business_insights"],
            "sensitivity_analysis": calculations["sensitivity_analysis"],
            "ai_analysis": ai_results,
            "fabric_storage": fabric_status,
        }

        logger.info(
            "pipeline_complete",
            duration=results["pipeline_run"]["duration_seconds"],
            status="success"
        )

        return results

    def _store_results(self, prices, calculations, ai_results) -> dict:
        """Store pipeline results in Fabric Lakehouse."""
        status = {
            "attempted": True,
            "success": False,
            "tables_written": [],
            "error": None,
        }

        try:
            cfg = get_config().fabric

            # Build records for storage
            price_records = []
            timestamp = datetime.utcnow().isoformat()
            for metal, data in prices.items():
                price_records.append({
                    "timestamp": timestamp,
                    "metal": metal,
                    "price": data.get("price", 0),
                    "unit": data.get("unit", "USD/mt"),
                    "source": data.get("source", "unknown"),
                })

            # Upload prices
            if self.fabric.upload_to_lakehouse("CommodityPrices", price_records):
                status["tables_written"].append("CommodityPrices")

            # Upload calculations
            calc_records = []
            for contract_type, values in calculations.get("gli_calculations", {}).items():
                calc_records.append({
                    "timestamp": timestamp,
                    "contract_type": contract_type,
                    "values_json": json.dumps(values),
                })

            if self.fabric.upload_to_lakehouse("ContractCalculations", calc_records):
                status["tables_written"].append("ContractCalculations")

            status["success"] = True

        except Exception as e:
            status["error"] = str(e)
            logger.warning("fabric_store_partial", error=str(e))

        return status

    def quick_analysis(self, query: str) -> str:
        """
        Run a quick natural language analysis.
        Fetches current prices and passes them to the AI for interpretation.

        Args:
            query: User's natural language question.

        Returns:
            AI-generated response.
        """
        # Fetch current prices
        prices = self.fetcher.fetch_all_metals()

        # Run calculations
        raw_prices = {
            "nickel": prices.get("nickel", {}).get("price", 18000),
            "cobalt": prices.get("cobalt", {}).get("price", 35000),
            "lithium": prices.get("lithium", {}).get("price", 25000),
        }
        calculations = run_all_calculations(raw_prices)

        # Generate AI interpretation
        system_prompt = (
            "You are GLI's Commodity Price Analyzer - an expert in battery metals "
            "recycling economics. Answer the user's question based on the provided "
            "current market data and GLI contract calculations."
        )

        user_content = (
            f"User Question: {query}\n\n"
            f"Current Prices:\n```json\n{json.dumps(raw_prices, indent=2)}\n```\n\n"
            f"GLI Calculations:\n```json\n{json.dumps(calculations['gli_calculations'], indent=2)}\n```"
        )

        response = self.ai._chat(system_prompt, user_content, temperature=0.4)
        return response


def main():
    """Run the pipeline from command line."""
    import argparse

    parser = argparse.ArgumentParser(description="Commodity Price Analyzer Pipeline")
    parser.add_argument("--quick", type=str, help="Quick analysis query")
    parser.add_argument("--skip-ai", action="store_true", help="Skip AI analysis")
    parser.add_argument("--metals", nargs="+", default=["nickel", "cobalt", "lithium"],
                       help="Metals to analyze")
    parser.add_argument("--output", type=str, help="Output file path (JSON)")
    args = parser.parse_args()

    pipeline = CommodityPipeline()

    if args.quick:
        result = pipeline.quick_analysis(args.quick)
        print(result)
    else:
        results = pipeline.run(metals=args.metals, skip_ai=args.skip_ai)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2, default=str)
            print(f"Results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
