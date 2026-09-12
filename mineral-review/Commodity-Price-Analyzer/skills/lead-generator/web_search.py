#!/usr/bin/env python3
"""
Web Search & Scraping Module for Lead Generator
Uses Brave Search API (primary) with Tavily fallback
Includes Hunter.io for email verification and Zyte for scraping
"""

import json
import requests
import time
from typing import List, Dict, Optional
from pathlib import Path

# Load config
CONFIG_PATH = Path(__file__).parent / "config.json"
with open(CONFIG_PATH) as f:
    CONFIG = json.load(f)


class WebSearchClient:
    """Web search with fallback chain: Brave → Tavily"""
    
    def __init__(self):
        self.brave_config = CONFIG["apis"]["brave_search"]
        self.tavily_config = CONFIG["apis"]["tavily"]
        self.default_search = CONFIG["web_access"]["default_search"]
        self.fallback_enabled = CONFIG["web_access"]["fallback_enabled"]
    
    def search(self, query: str, count: int = 10) -> List[Dict]:
        """
        Search web using primary API, fallback if needed
        
        Args:
            query: Search query string
            count: Number of results (max 20 for Brave)
            
        Returns:
            List of result dicts with title, url, snippet
        """
        try:
            return self._brave_search(query, count)
        except Exception as e:
            print(f"Brave Search failed: {e}")
            if self.fallback_enabled:
                print("Falling back to Tavily...")
                return self._tavily_search(query, count)
            raise
    
    def _brave_search(self, query: str, count: int) -> List[Dict]:
        """Brave Search API call"""
        headers = {
            "X-Subscription-Token": self.brave_config["api_key"],
            "Accept": "application/json"
        }
        params = {
            "q": query,
            "count": min(count, 20),
            "offset": 0,
            "mkt": "en-US",
            "safesearch": "off",
            "freshness": "pw"  # Past week for recent signals
        }
        
        resp = requests.get(
            f"{self.brave_config['base_url']}/web/search",
            headers=headers,
            params=params,
            timeout=30
        )
        resp.raise_for_status()
        
        data = resp.json()
        results = []
        
        for item in data.get("web", {}).get("results", []):
            results.append({
                "title": item.get("title"),
                "url": item.get("url"),
                "snippet": item.get("description"),
                "source": "brave"
            })
        
        return results
    
    def _tavily_search(self, query: str, count: int) -> List[Dict]:
        """Tavily API fallback"""
        headers = {"Content-Type": "application/json"}
        payload = {
            "api_key": self.tavily_config["api_key"],
            "query": query,
            "search_depth": "advanced",
            "max_results": count,
            "include_answer": True,
            "include_raw_content": False
        }
        
        resp = requests.post(
            f"{self.tavily_config['base_url']}/search",
            headers=headers,
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        
        data = resp.json()
        results = []
        
        for item in data.get("results", []):
            results.append({
                "title": item.get("title"),
                "url": item.get("url"),
                "snippet": item.get("content"),
                "source": "tavily"
            })
        
        return results


class EmailVerifier:
    """Hunter.io email verification"""
    
    def __init__(self):
        self.config = CONFIG["apis"]["hunter"]
        self.api_key = self.config["api_key"]
    
    def verify(self, email: str) -> Dict:
        """
        Verify email deliverability
        
        Args:
            email: Email address to verify
            
        Returns:
            Dict with status, score, etc.
        """
        params = {
            "email": email,
            "api_key": self.api_key
        }
        
        resp = requests.get(
            f"{self.config['base_url']}/email-verifier",
            params=params,
            timeout=30
        )
        resp.raise_for_status()
        
        return resp.json().get("data", {})
    
    def find_email(self, domain: str, first_name: str, last_name: str) -> Optional[str]:
        """
        Find email by name + domain
        
        Args:
            domain: Company domain (e.g., "acme.com")
            first_name: First name
            last_name: Last name
            
        Returns:
            Email address or None
        """
        params = {
            "domain": domain,
            "first_name": first_name,
            "last_name": last_name,
            "api_key": self.api_key
        }
        
        resp = requests.get(
            f"{self.config['base_url']}/email-finder",
            params=params,
            timeout=30
        )
        resp.raise_for_status()
        
        data = resp.json().get("data", {})
        return data.get("email")


class WebScraper:
    """Zyte API for web scraping"""
    
    def __init__(self):
        self.config = CONFIG["apis"]["zyte"]
        self.api_key = self.config["api_key"]
    
    def scrape(self, url: str, extract_rules: Optional[Dict] = None) -> Dict:
        """
        Scrape webpage via Zyte
        
        Args:
            url: Target URL
            extract_rules: Optional extraction rules for specific data
            
        Returns:
            Dict with scraped content
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {self.api_key}"
        }
        
        payload = {
            "url": url,
            "browserHtml": True,
            "javascript": True
        }
        
        if extract_rules:
            payload["extract"] = extract_rules
        
        resp = requests.post(
            f"{self.config['base_url']}/extract",
            headers=headers,
            json=payload,
            timeout=60
        )
        resp.raise_for_status()
        
        return resp.json()
    
    def scrape_linkedin_company(self, linkedin_url: str) -> Dict:
        """
        Scrape LinkedIn company page for key data
        Note: Zyte can handle JavaScript-rendered pages
        """
        extract_rules = {
            "company_name": {
                "selector": "h1",
                "type": "text"
            },
            "headcount": {
                "selector": "[data-test-id='about-us__size']",
                "type": "text"
            },
            "industry": {
                "selector": "[data-test-id='about-us__industry']",
                "type": "text"
            },
            "website": {
                "selector": "[data-test-id='about-us__website'] a",
                "type": "attribute",
                "attribute": "href"
            }
        }
        
        return self.scrape(linkedin_url, extract_rules)


class CompanyEnrichment:
    """Abstract API Company Enrichment for lead data enhancement"""
    
    def __init__(self):
        self.config = CONFIG["apis"]["abstract"]
        self.api_key = self.config["api_key"]
    
    def enrich_by_domain(self, domain: str) -> Dict:
        """
        Enrich company data by domain
        
        Args:
            domain: Company domain (e.g., "stripe.com")
            
        Returns:
            Dict with company details:
            - name, domain, year_founded
            - industry, employees_count
            - locality, country
            - linkedin_url, twitter_url, facebook_url
        """
        params = {
            "api_key": self.api_key,
            "domain": domain
        }
        
        resp = requests.get(
            self.config["base_url"],
            params=params,
            timeout=30
        )
        resp.raise_for_status()
        
        return resp.json()
    
    def enrich_by_email(self, email: str) -> Dict:
        """
        Enrich company data by email domain extraction
        
        Args:
            email: Email address (e.g., "john@acme.com")
            
        Returns:
            Company enrichment data
        """
        domain = email.split("@")[-1]
        return self.enrich_by_domain(domain)
    
    def bulk_enrich(self, domains: List[str]) -> List[Dict]:
        """
        Enrich multiple companies (with rate limiting)
        
        Args:
            domains: List of company domains
            
        Returns:
            List of enrichment results
        """
        results = []
        for domain in domains:
            try:
                result = self.enrich_by_domain(domain)
                results.append({"domain": domain, "data": result, "error": None})
                time.sleep(0.5)  # Rate limiting
            except Exception as e:
                results.append({"domain": domain, "data": None, "error": str(e)})
        
        return results
    
    def format_company_profile(self, data: Dict) -> str:
        """
        Format enrichment data for lead generation context
        
        Args:
            data: Abstract API response data
            
        Returns:
            Formatted company profile string
        """
        if not data or "name" not in data:
            return "No company data available"
        
        profile = f"""
Company Profile: {data.get('name', 'N/A')}
Domain: {data.get('domain', 'N/A')}
Founded: {data.get('year_founded', 'N/A')}
Industry: {data.get('industry', 'N/A')}
Employees: {data.get('employees_count', 'N/A')}
Location: {data.get('locality', '')}, {data.get('country', '')}
Social: LinkedIn ({data.get('linkedin_url', 'N/A')})
"""
        return profile.strip()


# Pre-built search queries for CFO lead gen
CFO_SEARCH_QUERIES = {
    "funding_recent": [
        '"Series A" "raised" "funding" "CFO" 2026',
        '"Series B" "announced" "million" startup CFO',
        '"funding round" "CFO" healthcare SaaS 2026'
    ],
    "cfo_departures": [
        '"CFO departed" OR "CFO left" OR "CFO resignation" company 2026',
        '"chief financial officer" "stepping down" OR "departing" startup',
        '"interim CFO" appointed company 2026'
    ],
    "fractional_cfo_search": [
        '"fractional CFO" services OR consultant OR consulting',
        '"interim CFO" OR "part-time CFO" startup scale',
        '"outsourced CFO" SaaS OR ecommerce OR healthcare'
    ],
    "executive_changes": [
        '"new CEO" AND "CFO search" private equity 2026',
        '"CEO appointed" AND "CFO opening" OR "CFO vacancy"',
        '"board of directors" CFO committee appointment 2026'
    ]
}


def search_funding_signals(industry: Optional[str] = None, stage: Optional[str] = None) -> List[Dict]:
    """
    Search for recent funding announcements
    
    Args:
        industry: Filter by industry (e.g., "healthcare", "SaaS")
        stage: Funding stage (e.g., "Series A", "Series B")
        
    Returns:
        List of search results
    """
    client = WebSearchClient()
    
    query = f'"{stage or "Series"}" funding "raised" {industry or ""} 2026'
    return client.search(query, count=20)


def search_cfo_opportunities(company_size: str = "5M-100M") -> List[Dict]:
    """
    Search for companies likely needing fractional CFO
    
    Args:
        company_size: Revenue range indicator
        
    Returns:
        List of potential leads
    """
    client = WebSearchClient()
    
    # Combine multiple query patterns
    all_results = []
    for query in CFO_SEARCH_QUERIES["cfo_departures"]:
        results = client.search(query, count=10)
        all_results.extend(results)
        time.sleep(1)  # Rate limiting
    
    # Deduplicate by URL
    seen_urls = set()
    unique_results = []
    for r in all_results:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            unique_results.append(r)
    
    return unique_results


if __name__ == "__main__":
    # Test the module
    print("Testing web search client...")
    client = WebSearchClient()
    
    test_query = '"fractional CFO" startup Series A 2026'
    results = client.search(test_query, count=5)
    
    print(f"\nFound {len(results)} results for: {test_query}")
    for r in results[:3]:
        print(f"- {r['title'][:60]}... ({r['source']})")
