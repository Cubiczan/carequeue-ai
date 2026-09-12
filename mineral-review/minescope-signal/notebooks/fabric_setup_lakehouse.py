# %% [markdown]
# # Minescope.Signal — Lakehouse Setup
# # Microsoft Fabric Notebook
#
# Creates all Delta tables required for the mining intelligence platform.
# Run this notebook once to initialize the Lakehouse schema.

# %%
# Cell 1 — Configuration
# =======================
LAKEHOUSE_NAME = "minescope_lakehouse"

# Delta table definitions: (table_name, columns_schema)
TABLES = {
    "mining_companies": """
        company_id STRING NOT NULL,
        name STRING NOT NULL,
        ticker STRING NOT NULL,
        company_tier STRING NOT NULL,
        sector STRING NOT NULL,
        headquarters STRING NOT NULL,
        primary_commodities ARRAY<STRING>,
        secondary_commodities ARRAY<STRING>,
        market_cap_usd DOUBLE,
        annual_revenue_usd DOUBLE,
        employees INT,
        listing_exchange STRING,
        esg_score DOUBLE,
        mine_count INT,
        active_mines INT,
        data_source STRING,
        last_updated DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "mine_sites": """
        mine_id STRING NOT NULL,
        mine_name STRING NOT NULL,
        company_name STRING NOT NULL,
        commodity STRING NOT NULL,
        country STRING NOT NULL,
        region_state STRING NOT NULL,
        latitude DOUBLE,
        longitude DOUBLE,
        status STRING NOT NULL,
        processing_method STRING NOT NULL,
        mill_capacity_tpd DOUBLE,
        strip_ratio DOUBLE,
        processing_recovery_pct DOUBLE,
        first_production_year INT,
        estimated_closure_year INT,
        mine_life_years DOUBLE,
        annual_throughput_tpa DOUBLE,
        data_source STRING,
        last_updated DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "reserve_estimates": """
        estimate_id STRING NOT NULL,
        mine_name STRING NOT NULL,
        commodity STRING NOT NULL,
        classification STRING NOT NULL,
        reporting_standard STRING NOT NULL,
        tonnage_kt DOUBLE NOT NULL,
        grade DOUBLE NOT NULL,
        grade_unit STRING NOT NULL,
        contained_metal DOUBLE,
        contained_metal_label STRING,
        is_reserve BOOLEAN,
        confidence_level INT,
        effective_date DATE,
        source_document STRING,
        data_source STRING,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "production_records": """
        record_id STRING NOT NULL,
        mine_name STRING NOT NULL,
        company_name STRING NOT NULL,
        commodity STRING NOT NULL,
        period_type STRING NOT NULL,
        year INT NOT NULL,
        quarter INT,
        period_label STRING NOT NULL,
        tonnes_milled_kt DOUBLE,
        ore_grade DOUBLE,
        grade_unit STRING,
        recovery_pct DOUBLE,
        metal_produced DOUBLE,
        metal_unit STRING,
        cash_cost DOUBLE,
        all_in_sustaining_cost DOUBLE,
        guidance_metal DOUBLE,
        guidance_variance_pct DOUBLE,
        beat_guidance BOOLEAN,
        data_source STRING,
        created_at DATE,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "commodity_prices": """
        price_id STRING NOT NULL,
        commodity STRING NOT NULL,
        price DOUBLE NOT NULL,
        currency STRING,
        unit STRING NOT NULL,
        source STRING NOT NULL,
        price_per_mt DOUBLE,
        price_per_lb DOUBLE,
        price_per_oz DOUBLE,
        change_pct_24h DOUBLE,
        high_52w DOUBLE,
        low_52w DOUBLE,
        price_range_pct DOUBLE,
        data_source STRING,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "aisc_metrics": """
        metric_id STRING NOT NULL,
        entity_name STRING NOT NULL,
        entity_type STRING NOT NULL,
        commodity STRING NOT NULL,
        year INT NOT NULL,
        quarter INT,
        period_label STRING,
        mining_cost DOUBLE,
        processing_cost DOUBLE,
        g_and_a DOUBLE,
        exploration DOUBLE,
        sustaining_capex DOUBLE,
        cash_cost DOUBLE,
        aisc DOUBLE,
        aic DOUBLE,
        cost_unit STRING,
        by_product_credits DOUBLE,
        net_aisc DOUBLE,
        ounces_produced_koz DOUBLE,
        industry_median_aisc DOUBLE,
        percentile_rank DOUBLE,
        cost_quartile STRING,
        vs_median DOUBLE,
        data_source STRING,
        created_at DATE,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "signal_scores": """
        score_id STRING NOT NULL,
        company_name STRING NOT NULL,
        ticker STRING NOT NULL,
        company_tier STRING NOT NULL,
        composite_score DOUBLE NOT NULL,
        grade_score DOUBLE,
        cost_score DOUBLE,
        production_score DOUBLE,
        growth_score DOUBLE,
        esg_score DOUBLE,
        rating STRING NOT NULL,
        commodity_price_at_calc DOUBLE,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "cost_curves": """
        curve_id STRING NOT NULL,
        commodity STRING NOT NULL,
        entity_name STRING NOT NULL,
        aisc DOUBLE NOT NULL,
        oz_produced_koz DOUBLE,
        cumulative_oz_koz DOUBLE,
        pct_of_total DOUBLE,
        margin_per_oz DOUBLE,
        quartile STRING,
        commodity_price DOUBLE,
        curve_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "reserve_comparisons": """
        comparison_id STRING NOT NULL,
        entity_name STRING NOT NULL,
        total_tonnage_kt DOUBLE,
        total_contained_metal DOUBLE,
        proven_probable_tonnage_kt DOUBLE,
        proven_probable_metal DOUBLE,
        avg_grade DOUBLE,
        conversion_ratio DOUBLE,
        commodity STRING,
        comparison_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "production_comparisons": """
        comparison_id STRING NOT NULL,
        entity_name STRING NOT NULL,
        total_produced DOUBLE,
        metal_unit STRING,
        periods INT,
        avg_grade DOUBLE,
        grade_trend STRING,
        avg_recovery_pct DOUBLE,
        guidance_beat_rate DOUBLE,
        commodity STRING,
        comparison_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "ai_analyses": """
        analysis_id STRING NOT NULL,
        company_name STRING NOT NULL,
        analysis_type STRING NOT NULL,
        commodity STRING,
        ai_model STRING NOT NULL,
        prompt_tokens INT,
        completion_tokens INT,
        analysis_markdown STRING,
        confidence_level STRING,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "ai_comparative": """
        comparison_id STRING NOT NULL,
        companies ARRAY<STRING> NOT NULL,
        commodities ARRAY<STRING>,
        comparative_markdown STRING,
        signal_scores_json STRING,
        ai_model STRING NOT NULL,
        prompt_tokens INT,
        completion_tokens INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
    "pipeline_runs": """
        run_id STRING NOT NULL,
        run_type STRING NOT NULL,
        status STRING NOT NULL,
        companies_processed INT,
        records_ingested INT,
        errors_json STRING,
        duration_seconds DOUBLE,
        started_at TIMESTAMP,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """,
}

print(f"Defined {len(TABLES)} Delta tables for Lakehouse: {LAKEHOUSE_NAME}")
for t in TABLES:
    print(f"  ✓ {t}")

# %%
# Cell 2 — Validate Spark Context
# ================================
try:
    df_check = spark.createDataFrame([(1, "test")], ["id", "val"])
    df_check.count()
    print("✓ Spark context available — running inside Fabric notebook")
except NameError:
    print("⚠ Spark not available — this notebook must run inside Microsoft Fabric")
    raise

# %%
# Cell 3 — Create Delta Tables
# ==============================
from pyspark.sql import SparkSession
from delta.tables import DeltaTable

created_tables = []
for table_name, schema_sql in TABLES.items():
    full_path = f"{LAKEHOUSE_NAME}.{table_name}"
    try:
        spark.sql(f"""
            CREATE TABLE IF NOT EXISTS {full_path} ({schema_sql})
            USING DELTA
        """)
        created_tables.append(table_name)
        print(f"  ✓ Created table: {table_name}")
    except Exception as e:
        print(f"  ✗ Error creating {table_name}: {e}")

print(f"\n✓ {len(created_tables)}/{len(TABLES)} tables created successfully")

# %%
# Cell 4 — Seed Mining Companies
# ================================
from pyspark.sql.types import *
import uuid

company_data = [
    ("c1", "Barrick Gold", "GOLD", "Major", "Precious Metals", "Toronto, Canada",
     ["Gold", "Copper"], [], 52_000_000_000, 12_800_000_000, 27000, "TSX/NYSE", 68.0, 15, 13, "seed"),
    ("c2", "Newmont", "NEM", "Major", "Precious Metals", "Denver, USA",
     ["Gold", "Copper", "Silver"], [], 48_000_000_000, 11_500_000_000, 31000, "NYSE", 72.0, 18, 16, "seed"),
    ("c3", "Freeport-McMoRan", "FCX", "Major", "Base Metals", "Phoenix, USA",
     ["Copper", "Gold", "Molybdenum"], ["Silver"], 58_000_000_000, 23_600_000_000, 46000, "NYSE", 55.0, 12, 10, "seed"),
    ("c4", "Glencore", "GLEN", "Major", "Base Metals", "Baar, Switzerland",
     ["Copper", "Zinc", "Nickel", "Coal"], ["Cobalt", "Silver"], 42_000_000_000, 217_000_000_000, 135000, "LSE", 48.0, 30, 25, "seed"),
    ("c5", "Lithium Americas", "LAC", "Junior", "Battery Metals", "Vancouver, Canada",
     ["Lithium"], [], 2_500_000_000, 0, 350, "TSX/NYSE", None, 2, 0, "seed"),
    ("c6", "Rio Tinto", "RIO", "Major", "Base Metals", "London, UK",
     ["Iron", "Aluminum", "Copper"], ["Lithium", "Diamonds"], 95_000_000_000, 51_800_000_000, 57000, "LSE/ASX", 76.0, 35, 28, "seed"),
    ("c7", "Southern Copper", "SCCO", "Mid-Tier", "Base Metals", "Phoenix, USA",
     ["Copper"], ["Molybdenum", "Silver", "Zinc"], 72_000_000_000, 10_600_000_000, 21000, "NYSE", 61.0, 8, 7, "seed"),
    ("c8", "Franco-Nevada", "FNV", "Royalty", "Precious Metals", "Toronto, Canada",
     ["Gold"], ["Silver", "PGE"], 22_000_000_000, 1_350_000_000, 40, "TSX/NYSE", 82.0, 0, 0, "seed"),
]

company_schema = StructType([
    StructField("company_id", StringType()),
    StructField("name", StringType()),
    StructField("ticker", StringType()),
    StructField("company_tier", StringType()),
    StructField("sector", StringType()),
    StructField("headquarters", StringType()),
    StructField("primary_commodities", ArrayType(StringType())),
    StructField("secondary_commodities", ArrayType(StringType())),
    StructField("market_cap_usd", DoubleType()),
    StructField("annual_revenue_usd", DoubleType()),
    StructField("employees", IntegerType()),
    StructField("listing_exchange", StringType()),
    StructField("esg_score", DoubleType()),
    StructField("mine_count", IntegerType()),
    StructField("active_mines", IntegerType()),
    StructField("data_source", StringType()),
])

df_companies = spark.createDataFrame(company_data, company_schema)
df_companies.write.mode("overwrite").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.mining_companies")
print(f"✓ Seeded {len(company_data)} mining companies")

# %%
# Cell 5 — Seed Mine Sites
# =========================
from datetime import date

mine_data = [
    ("m1", "Carlin", "Barrick Gold", "Gold", "USA", "Nevada", 40.724, -116.281, "Active", "Open Pit + Underground", 60000, None, 89.0, 1965, 1971, 2035, "seed"),
    ("m2", "Goldstrike", "Barrick Gold", "Gold", "USA", "Nevada", 40.845, -116.192, "Active", "Underground", 28000, None, 88.5, 1986, 1988, 2030, "seed"),
    ("m3", "Cortez", "Barrick Gold", "Gold", "USA", "Nevada", 40.003, -116.924, "Active", "Open Pit", 55000, 2.8, 90.2, 1969, 1972, 2040, "seed"),
    ("m4", "Pueblo Viejo", "Barrick Gold", "Gold", "Dominican Republic", "Sanchez Ramirez", 18.957, -70.145, "Active", "Open Pit", 24000, 3.2, 87.0, 2012, 2013, 2035, "seed"),
    ("m5", "Peñasquito", "Newmont", "Gold", "Mexico", "Zacatecas", 24.097, -101.626, "Active", "Open Pit", 20000, 5.1, 85.0, 2006, 2010, 2035, "seed"),
    ("m6", "Cerro Negro", "Newmont", "Gold", "Argentina", "Santa Cruz", -50.033, -69.833, "Active", "Underground", 4000, None, 92.5, 2014, 2015, 2030, "seed"),
    ("m7", "Boddington", "Newmont", "Gold", "Australia", "Western Australia", -32.750, 116.417, "Active", "Open Pit", 32000, 1.4, 83.0, 1987, 2009, 2040, "seed"),
    ("m8", "Grasberg", "Freeport-McMoRan", "Copper", "Indonesia", "Papua", -4.053, 137.111, "Active", "Underground", 100000, None, 96.0, 1988, 1990, 2045, "seed"),
    ("m9", "Morenci", "Freeport-McMoRan", "Copper", "USA", "Arizona", 33.083, -109.367, "Active", "Open Pit", 225000, 1.5, 88.0, 1870, 1939, 2040, "seed"),
    ("m10", "Cerro Verde", "Freeport-McMoRan", "Copper", "Peru", "Arequipa", -16.553, -71.603, "Active", "Open Pit", 400000, 2.0, 92.0, 1970, 1977, 2045, "seed"),
    ("m11", "Escondida", "BHP/Rio Tinto", "Copper", "Chile", "Antofagasta", -24.271, -69.069, "Active", "Open Pit", 360000, 1.3, 95.0, 1981, 1990, 2050, "seed"),
    ("m12", "Thistle Pass", "Lithium Americas", "Lithium", "Canada", "British Columbia", 59.300, -131.800, "Development", "Open Pit", 5000, None, 80.0, 2017, None, 2055, "seed"),
    ("m13", "Cuajone", "Southern Copper", "Copper", "Peru", "Moquegua", -17.067, -70.700, "Active", "Open Pit", 85000, 2.5, 91.0, 1970, 1976, 2040, "seed"),
    ("m14", "Toquepala", "Southern Copper", "Copper", "Peru", "Tacna", -17.450, -70.367, "Active", "Open Pit", 60000, 1.8, 90.5, 1954, 1960, 2035, "seed"),
]

mine_schema = StructType([
    StructField("mine_id", StringType()),
    StructField("mine_name", StringType()),
    StructField("company_name", StringType()),
    StructField("commodity", StringType()),
    StructField("country", StringType()),
    StructField("region_state", StringType()),
    StructField("latitude", DoubleType()),
    StructField("longitude", DoubleType()),
    StructField("status", StringType()),
    StructField("processing_method", StringType()),
    StructField("mill_capacity_tpd", DoubleType()),
    StructField("strip_ratio", DoubleType()),
    StructField("processing_recovery_pct", DoubleType()),
    StructField("discovery_year", IntegerType()),
    StructField("first_production_year", IntegerType()),
    StructField("estimated_closure_year", IntegerType()),
    StructField("data_source", StringType()),
])

df_mines = spark.createDataFrame(mine_data, mine_schema)
df_mines.write.mode("overwrite").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.mine_sites")
print(f"✓ Seeded {len(mine_data)} mine sites")

# %%
# Cell 6 — Seed Reserve Estimates
# ================================
reserve_data = [
    ("r1", "Carlin", "Gold", "Proven", "NI 43-101", 15200, 3.2, "g/t", 1566.5, "oz", True, 5),
    ("r2", "Carlin", "Gold", "Probable", "NI 43-101", 28400, 2.8, "g/t", 2563.8, "oz", True, 4),
    ("r3", "Goldstrike", "Gold", "Proven", "NI 43-101", 8900, 5.1, "g/t", 1459.2, "oz", True, 5),
    ("r4", "Goldstrike", "Gold", "Probable", "NI 43-101", 12300, 4.3, "g/t", 1700.6, "oz", True, 4),
    ("r5", "Cortez", "Gold", "Proven", "NI 43-101", 9800, 4.6, "g/t", 1450.5, "oz", True, 5),
    ("r6", "Cortez", "Gold", "Inferred", "NI 43-101", 18500, 2.1, "g/t", 1250.9, "oz", False, 1),
    ("r7", "Pueblo Viejo", "Gold", "Proven", "NI 43-101", 6200, 3.8, "g/t", 758.2, "oz", True, 5),
    ("r8", "Pueblo Viejo", "Gold", "Measured", "NI 43-101", 3400, 2.5, "g/t", 273.2, "oz", False, 3),
    ("r9", "Peñasquito", "Gold", "Proven", "NI 43-101", 5100, 0.45, "g/t", 73.8, "oz", True, 5),
    ("r10", "Boddington", "Gold", "Proven", "NI 43-101", 4200, 0.85, "g/t", 114.8, "oz", True, 5),
    ("r11", "Grasberg", "Copper", "Proven", "NI 43-101", 8200, 0.95, "%", 77900.0, "kt", True, 5),
    ("r12", "Grasberg", "Gold", "Proven", "NI 43-101", 8500, 0.68, "g/t", 185.9, "oz", True, 5),
    ("r13", "Morenci", "Copper", "Proven", "NI 43-101", 9500, 0.28, "%", 26600.0, "kt", True, 5),
    ("r14", "Escondida", "Copper", "Proven", "NI 43-101", 6800, 0.56, "%", 38080.0, "kt", True, 5),
    ("r15", "Escondida", "Copper", "Measured", "NI 43-101", 4200, 0.42, "%", 17640.0, "kt", False, 3),
    ("r16", "Thistle Pass", "Lithium", "Indicated", "NI 43-101", 28900, 0.82, "%", 236.98, "kt", False, 2),
    ("r17", "Thistle Pass", "Lithium", "Inferred", "NI 43-101", 45600, 0.74, "%", 337.44, "kt", False, 1),
    ("r18", "Cuajone", "Copper", "Proven", "NI 43-101", 4800, 0.45, "%", 21600.0, "kt", True, 5),
]

reserve_schema = StructType([
    StructField("estimate_id", StringType()),
    StructField("mine_name", StringType()),
    StructField("commodity", StringType()),
    StructField("classification", StringType()),
    StructField("reporting_standard", StringType()),
    StructField("tonnage_kt", DoubleType()),
    StructField("grade", DoubleType()),
    StructField("grade_unit", StringType()),
    StructField("contained_metal", DoubleType()),
    StructField("contained_metal_label", StringType()),
    StructField("is_reserve", BooleanType()),
    StructField("confidence_level", IntegerType()),
])

df_reserves = spark.createDataFrame(reserve_data, reserve_schema)
df_reserves.write.mode("overwrite").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.reserve_estimates")
print(f"✓ Seeded {len(reserve_data)} reserve estimates")

# %%
# Cell 7 — Seed Production Records
# =================================
production_data = [
    ("p1", "Carlin", "Barrick Gold", "Gold", "Quarterly", 2024, 1, "Q1 2024", 3850, 3.15, "g/t", 89.0, 348.0, "koz", 890, 1050, 340, 2.9, True, "seed"),
    ("p2", "Carlin", "Barrick Gold", "Gold", "Quarterly", 2024, 2, "Q2 2024", 4020, 3.05, "g/t", 89.0, 355.0, "koz", 910, 1030, 340, 4.4, True, "seed"),
    ("p3", "Carlin", "Barrick Gold", "Gold", "Quarterly", 2024, 3, "Q3 2024", 3780, 3.22, "g/t", 89.5, 342.0, "koz", 885, 1060, 335, 2.1, True, "seed"),
    ("p4", "Carlin", "Barrick Gold", "Gold", "Quarterly", 2024, 4, "Q4 2024", 3960, 3.18, "g/t", 89.2, 351.0, "koz", 895, 1045, 338, 3.3, True, "seed"),
    ("p5", "Goldstrike", "Barrick Gold", "Gold", "Quarterly", 2024, 1, "Q1 2024", 1950, 4.85, "g/t", 88.5, 272.0, "koz", 1020, 1180, 270, -0.7, False, "seed"),
    ("p6", "Goldstrike", "Barrick Gold", "Gold", "Quarterly", 2024, 2, "Q2 2024", 2100, 4.78, "g/t", 88.5, 285.0, "koz", 1040, 1165, 270, 5.6, True, "seed"),
    ("p7", "Grasberg", "Freeport-McMoRan", "Copper", "Quarterly", 2024, 1, "Q1 2024", 22000, 0.92, "%", 96.0, 489.0, "M lbs", 1.45, 1.95, "USD/lb", 480, 3.1, True, "seed"),
    ("p8", "Grasberg", "Freeport-McMoRan", "Copper", "Quarterly", 2024, 2, "Q2 2024", 23500, 0.90, "%", 96.0, 502.0, "M lbs", 1.48, 1.92, "USD/lb", 485, 4.2, True, "seed"),
    ("p9", "Morenci", "Freeport-McMoRan", "Copper", "Quarterly", 2024, 1, "Q1 2024", 52000, 0.26, "%", 88.0, 236.0, "M lbs", 2.10, 2.55, "USD/lb", 230, 2.6, True, "seed"),
    ("p10", "Escondida", "BHP/Rio Tinto", "Copper", "Quarterly", 2024, 1, "Q1 2024", 48000, 0.52, "%", 95.0, 276.0, "kt", 1.38, 1.72, "USD/lb", 270, 1.8, True, "seed"),
    ("p11", "Escondida", "BHP/Rio Tinto", "Copper", "Quarterly", 2024, 2, "Q2 2024", 50000, 0.50, "%", 95.0, 285.0, "kt", 1.35, 1.68, "USD/lb", 275, 3.6, True, "seed"),
    ("p12", "Cuajone", "Southern Copper", "Copper", "Quarterly", 2024, 1, "Q1 2024", 12500, 0.43, "%", 91.0, 49.0, "kt", 1.55, 1.90, "USD/lb", 48, 2.0, True, "seed"),
]

prod_schema = StructType([
    StructField("record_id", StringType()),
    StructField("mine_name", StringType()),
    StructField("company_name", StringType()),
    StructField("commodity", StringType()),
    StructField("period_type", StringType()),
    StructField("year", IntegerType()),
    StructField("quarter", IntegerType()),
    StructField("period_label", StringType()),
    StructField("tonnes_milled_kt", DoubleType()),
    StructField("ore_grade", DoubleType()),
    StructField("grade_unit", StringType()),
    StructField("recovery_pct", DoubleType()),
    StructField("metal_produced", DoubleType()),
    StructField("metal_unit", StringType()),
    StructField("cash_cost", DoubleType()),
    StructField("all_in_sustaining_cost", DoubleType()),
    StructField("guidance_metal", DoubleType()),
    StructField("guidance_variance_pct", DoubleType()),
    StructField("beat_guidance", BooleanType()),
    StructField("data_source", StringType()),
])

df_prod = spark.createDataFrame(production_data, prod_schema)
df_prod.write.mode("overwrite").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.production_records")
print(f"✓ Seeded {len(production_data)} production records")

# %%
# Cell 8 — Seed AISC Metrics
# ===========================
aisc_data = [
    ("a1", "Carlin", "mine", "Gold", 2024, 1, "Q1 2024", 580, 420, 180, 45, 120, 15, 890, 1050, 1150, "USD/oz", 25, "Cu", 348, 1325, 35.0, "Q2", None, "seed"),
    ("a2", "Goldstrike", "mine", "Gold", 2024, 1, "Q1 2024", 720, 380, 200, 35, 95, 12, 1020, 1180, 1280, "USD/oz", 15, "Cu", 272, 1325, 45.0, "Q3", None, "seed"),
    ("a3", "Cortez", "mine", "Gold", 2024, 1, "Q1 2024", 510, 350, 150, 40, 110, 10, 820, 960, 1060, "USD/oz", 30, "Cu", 185, 1325, 22.0, "Q1", None, "seed"),
    ("a4", "Peñasquito", "mine", "Gold", 2024, 1, "Q1 2024", 850, 520, 280, 55, 180, 25, 1100, 1350, 1500, "USD/oz", 180, "Zn,Ag", 72, 1325, 62.0, "Q4", None, "seed"),
    ("a5", "Boddington", "mine", "Gold", 2024, 1, "Q1 2024", 780, 450, 240, 50, 160, 20, 1050, 1220, 1380, "USD/oz", 95, "Cu", 68, 1325, 48.0, "Q3", None, "seed"),
    ("a6", "Grasberg", "mine", "Copper", 2024, 1, "Q1 2024", 0.85, 0.62, 0.35, 0.12, 0.48, 0.08, 1.45, 1.95, 2.20, "USD/lb", 0.35, "Au,Ag", 489, 1.65, 30.0, "Q2", None, "seed"),
    ("a7", "Morenci", "mine", "Copper", 2024, 1, "Q1 2024", 0.95, 0.72, 0.28, 0.08, 0.42, 0.05, 2.10, 2.55, 2.85, "USD/lb", 0.18, "Ag,Mo", 236, 1.65, 55.0, "Q3", None, "seed"),
    ("a8", "Escondida", "mine", "Copper", 2024, 1, "Q1 2024", 0.72, 0.55, 0.22, 0.06, 0.35, 0.04, 1.38, 1.72, 1.95, "USD/lb", 0.22, "Au,Ag", 276, 1.65, 25.0, "Q1", None, "seed"),
    ("a9", "Cuajone", "mine", "Copper", 2024, 1, "Q1 2024", 0.68, 0.52, 0.25, 0.08, 0.30, 0.04, 1.55, 1.90, 2.15, "USD/lb", 0.15, "Ag", 49, 1.65, 42.0, "Q3", None, "seed"),
]

aisc_schema = StructType([
    StructField("metric_id", StringType()),
    StructField("entity_name", StringType()),
    StructField("entity_type", StringType()),
    StructField("commodity", StringType()),
    StructField("year", IntegerType()),
    StructField("quarter", IntegerType()),
    StructField("period_label", StringType()),
    StructField("mining_cost", DoubleType()),
    StructField("processing_cost", DoubleType()),
    StructField("g_and_a", DoubleType()),
    StructField("exploration", DoubleType()),
    StructField("sustaining_capex", DoubleType()),
    StructField("rehab_closure", DoubleType()),
    StructField("cash_cost", DoubleType()),
    StructField("aisc", DoubleType()),
    StructField("aic", DoubleType()),
    StructField("cost_unit", StringType()),
    StructField("by_product_credits", DoubleType()),
    StructField("by_product_commodities", StringType()),
    StructField("ounces_produced_koz", DoubleType()),
    StructField("industry_median_aisc", DoubleType()),
    StructField("percentile_rank", DoubleType()),
    StructField("cost_quartile", StringType()),
    StructField("vs_median", DoubleType()),
    StructField("data_source", StringType()),
])

df_aisc = spark.createDataFrame(aisc_data, aisc_schema)
df_aisc.write.mode("overwrite").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.aisc_metrics")
print(f"✓ Seeded {len(aisc_data)} AISC metrics")

# %%
# Cell 9 — Seed Commodity Prices
# ===============================
price_data = [
    ("pr1", "Gold", 2340.50, "USD", "USD/oz", "Spot", 2340.50, 53.14, 75.28, 1980.00, 2450.00, 78.5, "api"),
    ("pr2", "Silver", 28.75, "USD", "USD/oz", "Spot", 28.75, 633817.57, 22.14, 30.64, 22.10, 45.2, "api"),
    ("pr3", "Copper", 9450.00, "USD", "USD/mt", "LME", 9450.00, 4.29, 20831.80, 7800.00, 10500.00, 63.9, "api"),
    ("pr4", "Nickel", 16850.00, "USD", "USD/mt", "LME", 16850.00, 37.15, 37155.26, 15500.00, 22000.00, 26.7, "api"),
    ("pr5", "Cobalt", 28500.00, "USD", "USD/mt", "Fastmarkets", 28500.00, 62824.37, 62824.37, 24000.00, 34000.00, 45.2, "api"),
    ("pr6", "Lithium", 13200.00, "USD", "USD/mt", "Fastmarkets", 13200.00, 29100.97, 29100.97, 10000.00, 18000.00, 44.4, "api"),
    ("pr7", "Iron", 112.50, "USD", "USD/mt", "Spot", 112.50, 0.25, 24797.25, 95.00, 130.00, 43.1, "api"),
    ("pr8", "Zinc", 2720.00, "USD", "USD/mt", "LME", 2720.00, 5.99, 5996.57, 2200.00, 3100.00, 52.9, "api"),
    ("pr9", "Platinum", 985.00, "USD", "USD/oz", "Spot", 985.00, 2168.67, 31670.89, 850.00, 1050.00, 80.9, "api"),
    ("pr10", "Palladium", 1025.00, "USD", "USD/oz", "Spot", 1025.00, 2256.07, 32955.52, 900.00, 1200.00, 42.9, "api"),
]

price_schema = StructType([
    StructField("price_id", StringType()),
    StructField("commodity", StringType()),
    StructField("price", DoubleType()),
    StructField("currency", StringType()),
    StructField("unit", StringType()),
    StructField("source", StringType()),
    StructField("price_per_mt", DoubleType()),
    StructField("price_per_lb", DoubleType()),
    StructField("price_per_oz", DoubleType()),
    StructField("low_52w", DoubleType()),
    StructField("high_52w", DoubleType()),
    StructField("price_range_pct", DoubleType()),
    StructField("data_source", StringType()),
])

df_prices = spark.createDataFrame(price_data, price_schema)
df_prices.write.mode("overwrite").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.commodity_prices")
print(f"✓ Seeded {len(price_data)} commodity prices")

# %%
# Cell 10 — Verify All Tables
# ============================
from pyspark.sql import DataFrame

verification = {}
for table_name in TABLES:
    try:
        df = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.{table_name}")
        count = df.count()
        verification[table_name] = {"rows": count, "status": "✓"}
        print(f"  ✓ {table_name}: {count:,} rows")
    except Exception as e:
        verification[table_name] = {"rows": 0, "status": f"✗ {str(e)[:60]}"}
        print(f"  ✗ {table_name}: ERROR")

total_rows = sum(v["rows"] for v in verification.values())
print(f"\n✓ Lakehouse ready: {len(TABLES)} tables, {total_rows:,} total rows")

# %%
# Cell 11 — Sample Queries
# =========================
print("=" * 60)
print("SAMPLE QUERIES — Minescope.Signal Lakehouse")
print("=" * 60)

# Top reserves by contained metal
print("\n▸ Top 5 Gold Reserves (contained oz):")
df_top_reserves = spark.sql(f"""
    SELECT mine_name, classification, tonnage_kt, grade, grade_unit,
           contained_metal, contained_metal_label
    FROM {LAKEHOUSE_NAME}.reserve_estimates
    WHERE commodity = 'Gold' AND is_reserve = true
    ORDER BY contained_metal DESC
    LIMIT 5
""")
df_top_reserves.show(truncate=False)

# AISC comparison
print("\n▸ AISC Benchmarking (Gold mines):")
df_aisc_comp = spark.sql(f"""
    SELECT entity_name, aisc, net_aisc, ounces_produced_koz,
           percentile_rank, cost_quartile
    FROM {LAKEHOUSE_NAME}.aisc_metrics
    WHERE commodity = 'Gold'
    ORDER BY aisc ASC
""")
df_aisc_comp.show(truncate=False)

# Production summary
print("\n▸ Latest Production by Company:")
df_prod_summary = spark.sql(f"""
    SELECT company_name, commodity, SUM(metal_produced) as total_produced,
           COUNT(*) as periods, AVG(ore_grade) as avg_grade
    FROM {LAKEHOUSE_NAME}.production_records
    GROUP BY company_name, commodity
    ORDER BY total_produced DESC
""")
df_prod_summary.show(truncate=False)

print("\n✓ Lakehouse setup complete. Ready for Minescope.Signal analytics.")
