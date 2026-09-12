"""
Configuration management for Commodity Price Analyzer.
Loads settings from environment variables and .env file.
"""
import os
from dataclasses import dataclass, field
from dotenv import load_dotenv
from typing import Optional

# Load .env file
load_dotenv()


@dataclass
class AzureAIConfig:
    """Azure AI Foundry configuration."""
    endpoint: str = field(default_factory=lambda: os.getenv("AZURE_AI_ENDPOINT", ""))
    api_key: str = field(default_factory=lambda: os.getenv("AZURE_AI_KEY", ""))
    deployment: str = field(default_factory=lambda: os.getenv("AZURE_AI_DEPLOYMENT", "Kimi-K2.6"))

    def validate(self) -> bool:
        if not self.endpoint or not self.api_key:
            raise ValueError(
                "Azure AI credentials not found. "
                "Set AZURE_AI_ENDPOINT and AZURE_AI_KEY in your .env file."
            )
        return True


@dataclass
class FabricConfig:
    """Microsoft Fabric configuration.

    Auth modes:
    - notebook: Inside Fabric notebooks. Spark authenticated automatically. NO Entra ID needed.
    - rest: External REST API calls. Requires Service Principal (Entra ID).
    - token: Direct Bearer token. Get from Fabric notebook, Azure CLI, or browser DevTools.
    """
    auth_mode: str = field(default_factory=lambda: os.getenv("FABRIC_AUTH_MODE", "notebook"))
    tenant_id: str = field(default_factory=lambda: os.getenv("FABRIC_TENANT_ID", ""))
    workspace_id: str = field(default_factory=lambda: os.getenv("FABRIC_WORKSPACE_ID", ""))
    lakehouse_id: str = field(default_factory=lambda: os.getenv("FABRIC_LAKEHOUSE_ID", ""))
    client_id: str = field(default_factory=lambda: os.getenv("FABRIC_CLIENT_ID", ""))
    client_secret: str = field(default_factory=lambda: os.getenv("FABRIC_CLIENT_SECRET", ""))
    bearer_token: str = field(default_factory=lambda: os.getenv("FABRIC_BEARER_TOKEN", ""))

    @property
    def workspace_url(self) -> str:
        return f"https://app.fabric.microsoft.com/groups/{self.workspace_id}"

    @property
    def api_base(self) -> str:
        return "https://api.fabric.microsoft.com/v1"

    @property
    def is_notebook_mode(self) -> bool:
        return self.auth_mode == "notebook"

    def validate_for_mode(self) -> bool:
        """Validate credentials for the current auth mode."""
        if self.auth_mode == "notebook":
            if not self.workspace_id or not self.lakehouse_id:
                raise ValueError(
                    "Fabric notebook mode requires FABRIC_WORKSPACE_ID and FABRIC_LAKEHOUSE_ID."
                )
        elif self.auth_mode == "rest":
            if not all([self.tenant_id, self.workspace_id, self.client_id]):
                raise ValueError(
                    "Fabric REST mode requires FABRIC_TENANT_ID, FABRIC_WORKSPACE_ID, "
                    "and FABRIC_CLIENT_ID."
                )
        elif self.auth_mode == "token":
            if not self.bearer_token:
                raise ValueError(
                    "Fabric token mode requires FABRIC_BEARER_TOKEN. "
                    "Get one from: Fabric notebook (mssparkutils), Azure CLI (az login), "
                    "or browser DevTools."
                )
        return True


@dataclass
class DataSourcesConfig:
    """External data source API keys."""
    alphavantage_key: str = field(default_factory=lambda: os.getenv("ALPHAVANTAGE_API_KEY", ""))
    twelve_data_key: str = field(default_factory=lambda: os.getenv("TWELVE_DATA_API_KEY", ""))
    regulations_gov_key: str = field(default_factory=lambda: os.getenv("REGULATIONS_GOV_API_KEY", ""))


@dataclass
class AppConfig:
    """Main application configuration."""
    azure_ai: AzureAIConfig = field(default_factory=AzureAIConfig)
    fabric: FabricConfig = field(default_factory=FabricConfig)
    data_sources: DataSourcesConfig = field(default_factory=DataSourcesConfig)
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    refresh_interval: int = field(default_factory=lambda: int(os.getenv("DATA_REFRESH_INTERVAL_MINUTES", "60")))
    retention_days: int = field(default_factory=lambda: int(os.getenv("HISTORY_RETENTION_DAYS", "365")))


# Singleton config instance
config = AppConfig()


def get_config() -> AppConfig:
    """Get the application configuration."""
    return config
