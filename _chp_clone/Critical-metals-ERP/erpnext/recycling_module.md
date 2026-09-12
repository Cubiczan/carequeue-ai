# Battery Recycling Module for ERPNext

Custom module extending ERPNext for battery recycling operations.

## Module Structure

```
recycling/
├── recycling/
│   ├── __init__.py
│   ├── hooks.py
│   ├── fixtures/
│   │   ├── custom_fields.json
│   │   ├── property_setters.json
│   │   └── workflow_states.json
│   ├── doctype/
│   │   ├── battery_batch/
│   │   │   ├── battery_batch.json
│   │   │   ├── battery_batch.py
│   │   │   └── battery_batch.js
│   │   ├── battery_grade/
│   │   ├── material_recovery/
│   │   ├── hazardous_material/
│   │   └── recycling_process/
│   ├── workflow/
│   │   ├── inbound_processing.json
│   │   ├── disassembly.json
│   │   └── material_recovery.json
│   ├── report/
│   │   ├── recycling_efficiency/
│   │   ├── material_yield/
│   │   └── hazardous_waste_tracking/
│   └── dashboard/
│       └── recycling_dashboard.py
├── templates/
└── setup.py
```

## Custom DocTypes

### 1. Battery Batch
Tracks inbound battery batches through the recycling process.

**Fields:**
- batch_id (Auto)
- supplier (Link: Supplier)
- receipt_date (Date)
- battery_type (Select: Li-ion, NiMH, Lead-acid, etc.)
- quantity (Int)
- weight_kg (Float)
- grade (Link: Battery Grade)
- hazardous_class (Select)
- status (Select: Received, Inspected, Discharging, Disassembly, Processing, Completed)
- current_location (Link: Warehouse)
- tracking_chain (Table: Batch Tracking)

### 2. Battery Grade
Classification of incoming batteries.

**Fields:**
- grade_code (Data)
- grade_name (Data)
- min_recovery_rate (Percent)
- typical_chemistry (Text)
- handling_instructions (Text)

### 3. Material Recovery
Records recovered materials from recycling process.

**Fields:**
- batch_reference (Link: Battery Batch)
- material_type (Link: Item)
- quantity_kg (Float)
- purity_percent (Percent)
- recovery_date (Date)
- quality_check (Link: Quality Inspection)
- warehouse (Link: Warehouse)

### 4. Hazardous Material
Tracks hazardous materials and waste.

**Fields:**
- material_name (Data)
- un_number (Data)
- hazard_class (Select)
- quantity_kg (Float)
- storage_location (Link: Warehouse)
- disposal_method (Select)
- disposal_date (Date)
- compliance_certificate (Attach)

### 5. Recycling Process
Defines recycling process steps.

**Fields:**
- process_name (Data)
- process_type (Select: Discharge, Disassembly, Shredding, Separation, Refining)
- workcenter (Link: Workstation)
- input_materials (Table: Process Input)
- output_materials (Table: Process Output)
- hazardous_byproducts (Table: Hazardous Output)
- standard_duration (Duration)

## Workflows

### Inbound Battery Processing Workflow

```
Receipt → Inspection → Grading → Discharge → Storage
   ↓         ↓          ↓         ↓         ↓
  WH      Quality     Grade    Safety    Location
  In      Check     Assignment  Check   Assignment
```

### Disassembly Workflow

```
Battery Pack → Casing Removal → Module Extraction → Cell Separation → Component Sorting
     ↓              ↓                ↓                  ↓                  ↓
  Safety        Hazardous        Material          Hazardous          Recycling
  Check         Handling         Recovery          Waste            Stream Assign
```

### Material Recovery Workflow

```
Shredding → Physical Separation → Chemical Processing → Refining → Quality Check → Storage
    ↓              ↓                    ↓               ↓            ↓          ↓
  Size         Magnetic/            Leaching/       Purity       Assay      Warehouse
  Reduction    Density             Smelting        Verification  Testing   Assignment
```

## Key Features

### 1. Batch Traceability
Full chain of custody from inbound receipt through final material storage.

### 2. Mass Balance Tracking
Input weight = Recovered materials + Waste + Loss

### 3. Recovery Rate Calculation
Automatic calculation of material recovery rates by battery type.

### 4. Hazardous Material Compliance
Tracking for regulatory compliance (EPA, DOT, local regulations).

### 5. Quality Integration
Quality inspections at each process checkpoint.

## Installation

```bash
# Copy module to ERPNext bench
cp -r recycling/ ~/frappe-bench/apps/recycling/

# Install app
bench --site erp.battery-recycling.local install-app recycling

# Migrate
bench --site erp.battery-recycling.local migrate
```

## API Endpoints

```
GET /api/method/recycling.api.get_battery_batch
POST /api/method/recycling.api.create_battery_batch
GET /api/method/recycling.api.get_traceability_chain
POST /api/method/recycling.api.record_material_recovery
GET /api/method/recycling.api.get_recovery_rates
```
