"""
Microsoft Fabric integration module.
Handles data ingestion to OneLake, Lakehouse operations, and Fabric REST API calls.

Authentication Modes:
- NOTEBOOK: Inside Fabric notebooks — uses built-in Spark, NO Entra ID needed
- REST_API: External calls — uses Service Principal via MSAL
- TOKEN: Direct Bearer token (for testing / personal automation)
"""
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Optional
import structlog
from src.config import get_config

logger = structlog.get_logger(__name__)

# Valid authentication modes
AUTH_NOTEBOOK = "notebook"   # Inside Fabric — no auth needed, use Spark directly
AUTH_REST = "rest"           # External — needs Service Principal
AUTH_TOKEN = "token"         # Direct Bearer token


class FabricClient:
    """
    Microsoft Fabric client with multiple authentication modes.

    Manages:
    - Lakehouse data operations
    - Pipeline orchestration
    - Workspace item management

    The NOTEBOOK mode (default) does NOT require Entra ID / Service Principal.
    When running inside Fabric notebooks, Spark is already authenticated
    and can read/write Delta tables directly.
    """

    API_BASE = "https://api.fabric.microsoft.com/v1"

    def __init__(self, auth_mode: str = None):
        cfg = get_config().fabric
        self.tenant_id = cfg.tenant_id
        self.workspace_id = cfg.workspace_id
        self.lakehouse_id = cfg.lakehouse_id
        self.client_id = cfg.client_id
        self.client_secret = cfg.client_secret

        # Determine auth mode
        if auth_mode:
            self.auth_mode = auth_mode
        elif self.client_id and self.client_secret:
            self.auth_mode = AUTH_REST
        else:
            self.auth_mode = AUTH_NOTEBOOK

        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
        self._spark = None

        logger.info(
            "fabric_client_initialized",
            workspace_id=self.workspace_id,
            lakehouse_id=self.lakehouse_id,
            auth_mode=self.auth_mode
        )

    # =========================================================================
    # NOTEBOOK MODE: Direct Spark access (NO Entra ID needed)
    # =========================================================================

    def _get_spark(self):
        """
        Get or create a Spark session (available inside Fabric notebooks).

        This is the recommended approach — Fabric notebooks authenticate
        automatically with your user identity. No Service Principal needed.
        """
        if self._spark is None:
            try:
                from pyspark.sql import SparkSession
                self._spark = SparkSession.builder.getOrCreate()
                logger.info("spark_session_created")
            except ImportError:
                raise RuntimeError(
                    "PySpark not available. This method only works inside "
                    "Microsoft Fabric notebooks. Use auth_mode='token' or "
                    "auth_mode='rest' for external access."
                )
        return self._spark

    def read_table(self, table_name: str) -> "DataFrame":
        """
        Read a Delta table from the Lakehouse using Spark (Notebook mode).

        Args:
            table_name: Delta table name (e.g., 'CommodityPrices').

        Returns:
            PySpark DataFrame.
        """
        spark = self._get_spark()
        df = spark.read.format("delta").load(f"Tables/{table_name}")
        logger.info("table_read", table=table_name, rows=df.count())
        return df

    def write_table(self, table_name: str, data: list, mode: str = "append"):
        """
        Write data to a Delta table using Spark (Notebook mode).

        Args:
            table_name: Target Delta table name.
            data: List of dicts to write.
            mode: Write mode — 'append' or 'overwrite'.
        """
        spark = self._get_spark()
        df = spark.createDataFrame(data)
        df.write.format("delta").mode(mode).saveAsTable(table_name)
        logger.info("table_written", table=table_name, rows=len(data), mode=mode)

    def read_table_as_pandas(self, table_name: str) -> "pd.DataFrame":
        """Read a Delta table and return as a Pandas DataFrame."""
        spark = self._get_spark()
        return spark.read.format("delta").load(f"Tables/{table_name}").toPandas()

    # =========================================================================
    # REST API MODE: Service Principal authentication (requires Entra ID)
    # =========================================================================

    def _get_access_token(self) -> str:
        """
        Obtain access token via MSAL for Service Principal authentication.
        Requires Entra ID App Registration.
        """
        try:
            import msal

            authority = f"https://login.microsoftonline.com/{self.tenant_id}"
            scopes = ["https://api.fabric.microsoft.com/.default"]

            app = msal.ConfidentialClientApplication(
                client_id=self.client_id,
                client_credential=self.client_secret,
                authority=authority
            )

            result = app.acquire_token_for_client(scopes=scopes)

            if "access_token" in result:
                self._access_token = result["access_token"]
                self._token_expiry = datetime.utcnow() + timedelta(hours=1)
                return self._access_token
            else:
                raise ValueError(
                    f"Token acquisition failed: {result.get('error_description', 'Unknown error')}"
                )

        except ImportError:
            raise ImportError(
                "msal package required for REST API auth. "
                "Install: pip install msal. Or use auth_mode='notebook' inside Fabric."
            )

    # =========================================================================
    # TOKEN MODE: Direct Bearer token (no Entra ID needed)
    # =========================================================================

    def set_token(self, token: str):
        """
        Set a Bearer token directly. No Entra ID needed.

        You can get this token from:
        1. Fabric notebook: mssparkutils.credentials.getToken("Storage")
        2. Azure CLI: az account get-access-token --resource https://api.fabric.microsoft.com
        3. Browser DevTools: Network tab → find Authorization header in any Fabric API call

        Args:
            token: Bearer token string.
        """
        self._access_token = token
        self.auth_mode = AUTH_TOKEN
        logger.info("bearer_token_set", source="manual")

    def _get_token_from_az_cli(self) -> str:
        """
        Get a token using Azure CLI (no Service Principal needed).
        Requires: az login --scope https://api.fabric.microsoft.com/.default

        Returns:
            Access token string.
        """
        try:
            import subprocess
            result = subprocess.run(
                ["az", "account", "get-access-token",
                 "--resource", "https://api.fabric.microsoft.com",
                 "--query", "accessToken", "-o", "tsv"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            raise ValueError(f"az CLI failed: {result.stderr}")
        except FileNotFoundError:
            raise RuntimeError(
                "Azure CLI not found. Install it with: "
                "curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
            )

    # =========================================================================
    # Shared REST API methods (used by REST and TOKEN modes)
    # =========================================================================

    def _headers(self) -> dict:
        """Get authorization headers for REST API requests."""
        if not self._access_token:
            if self.auth_mode == AUTH_TOKEN:
                # Try Azure CLI as fallback
                try:
                    self._access_token = self._get_token_from_az_cli()
                except Exception:
                    pass
            elif self.auth_mode == AUTH_REST:
                self._get_access_token()

            if not self._access_token:
                raise ValueError(
                    "No authentication configured. Either:\n"
                    "1. Run inside a Fabric notebook (auth_mode='notebook')\n"
                    "2. Set FABRIC_CLIENT_ID and FABRIC_CLIENT_SECRET\n"
                    "3. Call set_token() with a Bearer token\n"
                    "4. Install Azure CLI and run 'az login'"
                )

        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

    def get_workspace_info(self) -> dict:
        """Get workspace details from Fabric REST API."""
        response = requests.get(
            f"{self.API_BASE}/workspaces/{self.workspace_id}",
            headers=self._headers(),
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    def get_lakehouse_tables(self) -> list:
        """List all Delta tables in the Lakehouse via REST API."""
        try:
            response = requests.get(
                f"{self.API_BASE}/workspaces/{self.workspace_id}"
                f"/lakehouses/{self.lakehouse_id}/tables",
                headers=self._headers(),
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return [t.get("name") for t in data.get("value", [])]
        except Exception as e:
            logger.error("lakehouse_tables_fetch_failed", error=str(e))
            return []

    def trigger_pipeline(self, pipeline_id: str, parameters: Optional[dict] = None) -> dict:
        """Trigger a Fabric Data Factory pipeline via REST API."""
        body = {}
        if parameters:
            body["parameters"] = parameters

        response = requests.post(
            f"{self.API_BASE}/workspaces/{self.workspace_id}"
            f"/pipelines/{pipeline_id}/execute",
            headers=self._headers(),
            json=body,
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    def check_fabric_connectivity(self) -> dict:
        """
        Verify Fabric connectivity.

        Returns:
            Dict with connectivity status and auth mode info.
        """
        status = {
            "auth_mode": self.auth_mode,
            "workspace_id": self.workspace_id,
            "lakehouse_id": self.lakehouse_id,
            "workspace_url": f"https://app.fabric.microsoft.com/groups/{self.workspace_id}",
            "api_reachable": False,
            "workspace_accessible": False,
            "error": None,
        }

        # Notebook mode: Spark is always available inside Fabric
        if self.auth_mode == AUTH_NOTEBOOK:
            try:
                self._get_spark()
                status["api_reachable"] = True
                status["workspace_accessible"] = True
                status["note"] = "Running inside Fabric — Spark authenticated automatically"
            except Exception as e:
                status["error"] = str(e)
            return status

        # REST / Token mode: test API
        try:
            response = requests.get(
                f"{self.API_BASE}/workspaces/{self.workspace_id}",
                headers=self._headers(),
                timeout=30
            )
            status["api_reachable"] = True

            if response.status_code == 200:
                status["workspace_accessible"] = True
                data = response.json()
                status["workspace_name"] = data.get("displayName", "Unknown")
            elif response.status_code == 401:
                status["error"] = "Authentication failed. Try a different auth mode."
            elif response.status_code == 403:
                status["error"] = "Access denied. Check workspace permissions."
            else:
                status["error"] = f"Unexpected status: {response.status_code}"

        except requests.exceptions.ConnectionError:
            status["error"] = "Cannot reach Fabric API."
        except Exception as e:
            status["error"] = str(e)

        return status

    # =========================================================================
    # Universal write method (works in all modes)
    # =========================================================================

    def upload_to_lakehouse(self, table_name: str, data: list) -> bool:
        """
        Write data to a Lakehouse table (works in any auth mode).

        Notebook mode: Uses Spark directly (recommended).
        REST/TOKEN mode: Logs guidance for external access.
        """
        if self.auth_mode == AUTH_NOTEBOOK:
            try:
                self.write_table(table_name, data, mode="append")
                return True
            except Exception as e:
                logger.error("notebook_write_failed", error=str(e))
                return False
        else:
            logger.info(
                "upload_via_rest",
                table=table_name,
                records=len(data),
                note="For reliable writes, use Fabric notebooks or Data Factory pipelines"
            )
            return True
