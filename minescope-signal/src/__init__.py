"""
Minescope.Signal — Mining Intelligence Platform (Fabric + AI Foundry)

A Microsoft Fabric-native mining intelligence system that extracts actionable
signals from commodity pricing, reserve estimates, production data, and AISC
benchmarks.  AI Foundry agents provide comparative cross-company analysis and
narrative intelligence.

Stack:
  - Data Lakehouse : Microsoft Fabric Delta Tables
  - AI            : Azure AI Foundry (OpenAI-compatible endpoint)
  - APIs          : FRED, AlphaVantage, Twelve Data
  - Notebooks     : Fabric Notebook (.py with # %% cell markers)
"""

__version__ = "0.1.0"
