app_name = "recycling"
app_title = "Battery Recycling"
app_version = "1.0.0"
app_description = "Battery Recycling Module for ERPNext - Tracks battery lifecycle from receipt through material recovery"
app_author = "Battery Recycling Company"
app_license = "PROPRIETARY"

# Frappe/ERPNext compatibility
frappe_version = "15"
depends_on = ["erpnext"]
app_color = "#4CAF50"
app_icon = "recycle"
module = "Recycling"

modules = [
    {
        "name": "Recycling",
        "doctype": "Module Def",
        "custom": 0,
        "module_name": "Recycling"
    }
]

fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["dt", "in", ["Work Order", "Stock Entry", "Batch", "Item"]]
        ]
    },
    {
        "dt": "Property Setter",
        "filters": [
            ["doc_type", "in", ["Work Order", "Stock Entry", "Batch"]]
        ]
    }
]

doc_events = {
    "Work Order": {
        "before_insert": "recycling.overrides.work_order.before_insert",
        "validate": "recycling.overrides.work_order.validate",
        "on_submit": "recycling.overrides.work_order.on_submit"
    },
    "Stock Entry": {
        "validate": "recycling.overrides.stock_entry.validate",
        "on_submit": "recycling.overrides.stock_entry.on_submit"
    },
    "Batch": {
        "validate": "recycling.overrides.batch.validate"
    },
    "Quality Inspection": {
        "validate": "recycling.overrides.quality_inspection.validate",
        "on_submit": "recycling.overrides.quality_inspection.on_submit"
    }
}

overrides = {
    "Work Order": "recycling.overrides.work_order.WorkOrderOverride",
    "Stock Entry": "recycling.overrides.stock_entry.StockEntryOverride"
}

standard_queries = {
    "Battery Batch": "recycling.queries.battery_batch"
}
