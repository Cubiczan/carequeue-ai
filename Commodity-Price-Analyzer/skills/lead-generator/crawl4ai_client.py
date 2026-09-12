#!/usr/bin/env python3
"""
Crawl4AI Integration for Lead Generator
Uses Z AI (GLM-4.7) for LLM-based content extraction
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional

# Set Z AI API key for crawl4ai LLM extraction
os.environ["ZAI_API_KEY"] = "117440ed43074d7a81854e9ff489e51a.4mTGwEtHtr4JX8JR"
os.environ["CRAWL4AI_LLM_PROVIDER"] = "zai"
os.environ["CRAWL4AI_LLM_MODEL"] = "glm-4.7"

# Import crawl4ai
try:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
    from crawl4ai.content_filter_strategy import LLMContentFilter
    from crawl4ai.extraction_strategy import LLMExtractionStrategy
    CRAWL4AI_AVAILABLE = True
except ImportError:
    CRAWL4AI_AVAILABLE = False
    print("Warning: crawl4ai not available. Install with: pip install crawl4ai")


class Crawl4AIClient:
    """Crawl4AI wrapper with Z AI integration for lead generation"""
    
    def __init__(self):
        if not CRAWL4AI_AVAILABLE:
            raise ImportError("crawl4ai not installed. Run: pip install crawl4ai")
        
        self.api_key = os.environ["ZAI_API_KEY"]
        self.model = os.environ["CRAWL4AI_LLM_MODEL"]
        
        # Browser config for headless crawling
        self.browser_config = BrowserConfig(
            headless=True,
            verbose=False,
            extra_args=["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"]
        )
    
    async def crawl_company_website(self, url: str, extraction_schema: Optional[Dict] = None) -> Dict:
        """
        Crawl company website and extract structured data using Z AI
        
        Args:
            url: Company website URL
            extraction_schema: Optional schema for structured extraction
            
        Returns:
            Dict with crawled content and extracted data
        """
        # Default extraction schema for CFO lead gen
        if extraction_schema is None:
            extraction_schema = {
                "company_name": "Company name",
                "industry": "Industry or sector",
                "headquarters": "Company headquarters location",
                "employee_count": "Number of employees (range or exact)",
                "funding_stage": "Funding stage if mentioned (Series A/B/C, etc.)",
                "revenue_range": "Revenue range if mentioned",
                "executive_team": "List of key executives and titles",
                "recent_news": "Recent company news or announcements",
                "careers_page": "URL to careers/job page if found"
            }
        
        # Configure LLM extraction strategy
        extraction_strategy = LLMExtractionStrategy(
            provider="zai/glm-4.7",
            api_key=self.api_key,
            schema=extraction_schema,
            extraction_type="schema",
            instruction="Extract structured company information for lead generation. Be precise and only include verified information."
        )
        
        # Crawler config
        run_config = CrawlerRunConfig(
            extraction_strategy=extraction_strategy,
            content_filter=LLMContentFilter(
                provider="zai/glm-4.7",
                api_key=self.api_key,
                instruction="Focus on business-relevant content: company info, leadership, funding, hiring. Remove navigation, ads, and footer content."
            ),
            cache_mode="enabled",
            page_timeout=30000
        )
        
        # Execute crawl
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            result = await crawler.arun(url=url, config=run_config)
            
            return {
                "url": url,
                "success": result.success,
                "content": result.cleaned_html if result.success else None,
                "markdown": result.markdown if result.success else None,
                "extracted_data": json.loads(result.extracted_content) if result.success and result.extracted_content else None,
                "links": list(result.links.values()) if result.success else [],
                "metadata": {
                    "title": result.metadata.get("title") if result.success else None,
                    "description": result.metadata.get("description") if result.success else None
                }
            }
    
    async def crawl_job_postings(self, company_url: str) -> List[Dict]:
        """
        Crawl company careers page and extract job postings
        
        Args:
            company_url: Company website URL
            
        Returns:
            List of job postings (especially CFO/finance roles)
        """
        jobs_schema = {
            "job_postings": [
                {
                    "title": "Job title",
                    "department": "Department or team",
                    "location": "Job location",
                    "employment_type": "Full-time, part-time, contract",
                    "description": "Brief job description",
                    "requirements": "Key requirements",
                    "posted_date": "Date posted if available"
                }
            ]
        }
        
        # Try common careers page URLs
        careers_urls = [
            f"{company_url.rstrip('/')}/careers",
            f"{company_url.rstrip('/')}/jobs",
            f"{company_url.rstrip('/')}/about/careers",
            f"{company_url.rstrip('/')}/work-with-us"
        ]
        
        all_jobs = []
        
        for careers_url in careers_urls:
            try:
                result = await self.crawl_company_website(careers_url, jobs_schema)
                if result["success"] and result["extracted_data"]:
                    jobs = result["extracted_data"].get("job_postings", [])
                    # Filter for finance/CFO related roles
                    finance_keywords = ["cfo", "chief financial", "finance", "accounting", "controller", "fp&a"]
                    for job in jobs:
                        title = job.get("title", "").lower()
                        if any(kw in title for kw in finance_keywords):
                            job["source_url"] = careers_url
                            all_jobs.append(job)
            except Exception as e:
                print(f"Failed to crawl {careers_url}: {e}")
                continue
        
        return all_jobs
    
    async def crawl_executive_team(self, company_url: str) -> List[Dict]:
        """
        Crawl company team/leadership page
        
        Args:
            company_url: Company website URL
            
        Returns:
            List of executives with titles
        """
        team_schema = {
            "executives": [
                {
                    "name": "Executive name",
                    "title": "Job title",
                    "bio": "Brief bio if available",
                    "linkedin": "LinkedIn URL if available"
                }
            ]
        }
        
        # Try common team page URLs
        team_urls = [
            f"{company_url.rstrip('/')}/team",
            f"{company_url.rstrip('/')}/leadership",
            f"{company_url.rstrip('/')}/about/team",
            f"{company_url.rstrip('/')}/about/leadership",
            f"{company_url.rstrip('/')}/company/team"
        ]
        
        for team_url in team_urls:
            try:
                result = await self.crawl_company_website(team_url, team_schema)
                if result["success"] and result["extracted_data"]:
                    executives = result["extracted_data"].get("executives", [])
                    if executives:
                        return executives
            except Exception as e:
                continue
        
        return []


# Synchronous wrapper for easier usage
def crawl_company_sync(url: str, extraction_schema: Optional[Dict] = None) -> Dict:
    """Synchronous wrapper for crawl_company_website"""
    import asyncio
    
    client = Crawl4AIClient()
    return asyncio.run(client.crawl_company_website(url, extraction_schema))


def find_cfo_vacancy(company_url: str) -> Optional[Dict]:
    """
    Check if company has CFO/finance job postings
    
    Args:
        company_url: Company website
        
    Returns:
        Job posting dict if CFO vacancy found, None otherwise
    """
    import asyncio
    
    client = Crawl4AIClient()
    jobs = asyncio.run(client.crawl_job_postings(company_url))
    
    # Look for CFO-specific roles
    for job in jobs:
        title = job.get("title", "").lower()
        if "cfo" in title or "chief financial" in title:
            return job
    
    return None


if __name__ == "__main__":
    # Test crawl4ai with Z AI
    import asyncio
    
    async def test():
        print("Testing crawl4ai with Z AI (GLM-4.7)...")
        client = Crawl4AIClient()
        
        # Test crawl
        result = await client.crawl_company_website("https://example.com")
        print(f"Crawl success: {result['success']}")
        if result['extracted_data']:
            print(f"Extracted: {json.dumps(result['extracted_data'], indent=2)}")
    
    asyncio.run(test())
