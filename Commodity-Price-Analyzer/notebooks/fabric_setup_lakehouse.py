"""
Microsoft Fabric Notebook: Data Pipeline Setup
================================================
Run this notebook FIRST to set up the Lakehouse tables
before running the main analysis notebook.

PREREQUISITE: Attach this Lakehouse as the default reference
(Explorer pane -> Add -> Lakehouse -> Commodity_Price_Analyzer_Lakehouse)

Compatible with schema-enabled Lakehouses (Fabric default for new Lakehouses).
"""

# =============================================================================
# CELL 1: Initialize
# =============================================================================

from pyspark.sql import SparkSession
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, BooleanType
)
from datetime import datetime

spark = SparkSession.builder.getOrCreate()
print("Spark session initialized.")
print(f"Workspace ID: {spark.conf.get('spark.fabric.workspaceId', 'N/A')}")

# =============================================================================
# CELL 2: Create CommodityPrices Table
# =============================================================================

price_schema = StructType([
    StructField("timestamp", StringType(), False),
    StructField("metal", StringType(), False),
    StructField("price", DoubleType(), False),
    StructField("unit", StringType(), True),
    StructField("source", StringType(), True),
    StructField("change_pct", DoubleType(), True),
])

initial_prices = [
    (datetime.utcnow().isoformat(), "Nickel", 18500.0, "USD/mt", "AlphaVantage", 0.0),
    (datetime.utcnow().isoformat(), "Cobalt", 32000.0, "USD/mt", "AlphaVantage", 0.0),
    (datetime.utcnow().isoformat(), "Lithium", 25000.0, "USD/mt", "AlphaVantage", 0.0),
    (datetime.utcnow().isoformat(), "Copper", 8500.0, "USD/mt", "AlphaVantage", 0.0),
    (datetime.utcnow().isoformat(), "Manganese", 3200.0, "USD/mt", "AlphaVantage", 0.0),
]

df_prices = spark.createDataFrame(initial_prices, price_schema)
df_prices.write.format("delta").mode("overwrite").saveAsTable("CommodityPrices")
print("Table 'CommodityPrices' created with 5 seed records.")

# =============================================================================
# CELL 3: Create ContractCalculations Table
# =============================================================================

calc_schema = StructType([
    StructField("timestamp", StringType(), False),
    StructField("contract_type", StringType(), False),
    StructField("values_json", StringType(), False),
])

# Use a seed record (empty DataFrames fail with saveAsTable)
df_calc = spark.createDataFrame(
    [(datetime.utcnow().isoformat(), "_seed", "{}")],
    calc_schema
)
df_calc.write.format("delta").mode("overwrite").saveAsTable("ContractCalculations")
# Remove seed record
spark.sql("DELETE FROM ContractCalculations WHERE contract_type = '_seed'")
print("Table 'ContractCalculations' created.")

# =============================================================================
# CELL 4: Create ContractAnalysis Table
# =============================================================================

analysis_schema = StructType([
    StructField("timestamp", StringType(), False),
    StructField("ni_price", DoubleType(), False),
    StructField("co_price", DoubleType(), False),
    StructField("li_price", DoubleType(), False),
    StructField("black_mass_value", DoubleType(), True),
    StructField("mhp_profit_share_triggered", BooleanType(), True),
    StructField("li_floor_active", BooleanType(), True),
    StructField("li_ceiling_active", BooleanType(), True),
    StructField("ai_analysis", StringType(), True),
])

df_analysis = spark.createDataFrame(
    [(datetime.utcnow().isoformat(), 0.0, 0.0, 0.0, None, None, None, None, "_seed")],
    analysis_schema
)
df_analysis.write.format("delta").mode("overwrite").saveAsTable("ContractAnalysis")
spark.sql("DELETE FROM ContractAnalysis WHERE ai_analysis = '_seed'")
print("Table 'ContractAnalysis' created.")

# =============================================================================
# CELL 5: Create RegulatoryAlerts Table
# =============================================================================

reg_schema = StructType([
    StructField("timestamp", StringType(), False),
    StructField("regulation_id", StringType(), True),
    StructField("title", StringType(), True),
    StructField("agency", StringType(), True),
    StructField("relevance_score", DoubleType(), True),
    StructField("summary", StringType(), True),
])

df_reg = spark.createDataFrame(
    [(datetime.utcnow().isoformat(), "_seed", "_seed", "_seed", 0.0, "_seed")],
    reg_schema
)
df_reg.write.format("delta").mode("overwrite").saveAsTable("RegulatoryAlerts")
spark.sql("DELETE FROM RegulatoryAlerts WHERE regulation_id = '_seed'")
print("Table 'RegulatoryAlerts' created.")

# =============================================================================
# CELL 6: Verify All Tables
# =============================================================================

tables = spark.catalog.listTables()
print("\n" + "=" * 50)
print("Lakehouse Tables Created Successfully:")
print("=" * 50)
for table in tables:
    count = spark.table(table.name).count()
    print(f"  {table.name}: {count} records")

print("\nSetup complete! You can now run the main analysis notebook.")
