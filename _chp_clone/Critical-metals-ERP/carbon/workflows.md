# Carbon Manufacturing Workflows for Battery Recycling

Configuration for Carbon Manufacturing Execution System (MES) tailored for battery recycling operations.

## Workflow Configuration

### 1. Inbound Battery Processing

```typescript
// workflows/inbound-processing.ts
export const inboundProcessing = {
  name: 'Inbound Battery Processing',
  version: '1.0.0',
  stages: [
    {
      id: 'receipt',
      name: 'Battery Receipt',
      type: 'receiving',
      checks: [
        { name: 'Documentation Check', required: true },
        { name: 'Visual Inspection', required: true },
        { name: 'Weight Verification', required: true }
      ],
      dataCapture: [
        'supplier_batch_id',
        'battery_type',
        'quantity',
        'weight_kg',
        'pack_configuration'
      ]
    },
    {
      id: 'inspection',
      name: 'Technical Inspection',
      type: 'quality',
      checks: [
        { name: 'Voltage Check', required: true, min: 0, max: 60 },
        { name: 'Internal Resistance', required: true },
        { name: 'Physical Damage Assessment', required: true },
        { name: 'Leak Detection', required: true }
      ],
      grading: {
        grades: ['A', 'B', 'C', 'D', 'SCRAP'],
        criteria: {
          A: { minVoltage: 3.0, maxResistance: 50, damage: 'none' },
          B: { minVoltage: 2.5, maxResistance: 100, damage: 'minor' },
          C: { minVoltage: 2.0, maxResistance: 200, damage: 'moderate' },
          D: { minVoltage: 1.0, maxResistance: 500, damage: 'significant' },
          SCRAP: { below: 'D' }
        }
      }
    },
    {
      id: 'discharge',
      name: 'Safe Discharge',
      type: 'processing',
      parameters: {
        dischargeMethod: ['resistive', 'active_balancing'],
        targetVoltage: 2.5,
        maxTemperature: 45,
        monitoringInterval: 60 // seconds
      },
      safetyChecks: [
        'Temperature monitoring active',
        'Ventilation system operational',
        'Fire suppression ready'
      ]
    },
    {
      id: 'storage',
      name: 'Conditioned Storage',
      type: 'warehousing',
      requirements: {
        temperature: { min: 15, max: 25 },
        humidity: { max: 60 },
        segregation: 'by_chemistry'
      }
    }
  ]
};
```

### 2. Disassembly Workflow

```typescript
// workflows/disassembly.ts
export const disassembly = {
  name: 'Battery Disassembly',
  version: '1.0.0',
  stages: [
    {
      id: 'casing_removal',
      name: 'External Casing Removal',
      type: 'mechanical',
      tools: ['cutting_tool', 'fastener_removal', 'pry_tool'],
      outputs: [
        { type: 'casing_material', category: 'recyclable' },
        { type: 'fasteners', category: 'recyclable' },
        { type: 'labels_stickers', category: 'waste' }
      ],
      hazards: ['sharp_edges', 'chemical_residue']
    },
    {
      id: 'module_extraction',
      name: 'Module Extraction',
      type: 'mechanical',
      steps: [
        'Disconnect high voltage connectors',
        'Remove busbars',
        'Extract battery modules',
        'Isolate BMS (Battery Management System)'
      ],
      outputs: [
        { type: 'battery_modules', category: 'process_intermediate' },
        { type: 'bms_unit', category: 'refurbishable' },
        { type: 'busbars', category: 'recyclable' },
        { type: 'wiring_harness', category: 'recyclable' }
      ],
      hazards: ['high_voltage', 'short_circuit']
    },
    {
      id: 'cell_separation',
      name: 'Cell Separation from Modules',
      type: 'mechanical',
      parameters: {
        depackingMethod: ['mechanical', 'thermal', 'cryogenic'],
        temperatureLimit: 60
      },
      outputs: [
        { type: 'cells', category: 'process_intermediate' },
        { type: 'module_casing', category: 'recyclable' },
        { type: 'cooling_materials', category: 'waste' },
        { type: 'adhesives', category: 'hazardous_waste' }
      ]
    },
    {
      id: 'component_sorting',
      name: 'Component Sorting',
      type: 'sorting',
      sortStreams: [
        { name: 'Li-ion Cells', destination: 'shredding' },
        { name: 'NiMH Cells', destination: 'separate_processing' },
        { name: 'Electronics (BMS)', destination: 'e-waste_recycling' },
        { name: 'Copper Busbars', destination: 'metal_recycling' },
        { name: 'Aluminum Casing', destination: 'metal_recycling' },
        { name: 'Plastics', destination: 'plastic_recycling' },
        { name: 'Hazardous Waste', destination: 'hazmat_storage' }
      ]
    }
  ]
};
```

### 3. Material Recovery Workflow

```typescript
// workflows/material-recovery.ts
export const materialRecovery = {
  name: 'Material Recovery',
  version: '1.0.0',
  processes: [
    {
      id: 'shredding',
      name: 'Size Reduction',
      type: 'mechanical',
      parameters: {
        targetSize: '10-50mm',
        atmosphere: 'nitrogen_inert',
        temperature: 'ambient'
      },
      outputs: [
        { name: 'shredded_material', composition: 'mixed' }
      ],
      emissions: {
        dust: 'captured',
        vocs: 'scrubbed'
      }
    },
    {
      id: 'physical_separation',
      name: 'Physical Separation',
      type: 'separation',
      methods: [
        {
          name: 'Magnetic Separation',
          target: 'ferrous_metals',
          efficiency: 0.95
        },
        {
          name: 'Eddy Current Separation',
          target: 'non-ferrous_metals',
          efficiency: 0.90
        },
        {
          name: 'Density Separation',
          target: 'plastics_vs_metals',
          efficiency: 0.85
        },
        {
          name: 'Screening',
          target: 'size_classification',
          meshSizes: ['10mm', '5mm', '1mm']
        }
      ],
      outputs: [
        { name: 'ferrous_fraction', destination: 'steel_recycling' },
        { name: 'non-ferrous_fraction', destination: 'further_processing' },
        { name: 'plastic_fraction', destination: 'plastic_recycling' },
        { name: 'black_mass', destination: 'hydrometallurgy' }
      ]
    },
    {
      id: 'hydrometallurgy',
      name: 'Hydrometallurgical Processing',
      type: 'chemical',
      stages: [
        {
          name: 'Leaching',
          reagents: ['H2SO4', 'H2O2'],
          conditions: {
            temperature: 60,
            ph: 1.5,
            duration: 4 // hours
          }
        },
        {
          name: 'Solvent Extraction',
          target: ['cobalt', 'nickel'],
          efficiency: 0.98
        },
        {
          name: 'Precipitation',
          products: [
            'cobalt_sulfate',
            'nickel_sulfate',
            'manganese_carbonate'
          ]
        }
      ],
      outputs: [
        { name: 'cobalt_sulfate', purity: 0.99, category: 'saleable_product' },
        { name: 'nickel_sulfate', purity: 0.99, category: 'saleable_product' },
        { name: 'manganese_carbonate', purity: 0.95, category: 'saleable_product' },
        { name: 'lithium_carbonate', purity: 0.99, category: 'saleable_product' },
        { name: 'process_waste', category: 'hazardous_waste' }
      ]
    },
    {
      id: 'refining',
      name: 'Product Refining',
      type: 'purification',
      processes: [
        'crystallization',
        'drying',
        'packaging'
      ],
      qualityChecks: [
        'ICP-OES analysis',
        'Particle size distribution',
        'Moisture content',
        'Bulk density'
      ]
    }
  ]
};
```

## Traceability Configuration

```typescript
// traceability/config.ts
export const traceabilityConfig = {
  // Batch genealogy tracking
  genealogy: {
    trackInputs: true,
    trackOutputs: true,
    trackTransformations: true,
    massBalance: true
  },

  // Data captured at each step
  dataCapture: {
    timestamps: ['start', 'end'],
    operators: true,
    equipment: true,
    parameters: true,
    qualityData: true,
    exceptions: true
  },

  // Chain of custody
  custody: {
    requireSignOff: true,
    trackLocation: true,
    trackCondition: true
  }
};
```

## Quality Management Configuration

```typescript
// quality/config.ts
export const qualityConfig = {
  inspectionPlans: {
    inbound: {
      frequency: 'per_batch',
      characteristics: [
        { name: 'Voltage', method: 'multimeter', spec: { min: 0, max: 60 } },
        { name: 'Weight', method: 'scale', spec: { tolerance: 0.05 } },
        { name: 'Dimensions', method: 'caliper', spec: { tolerance: 1.0 } },
        { name: 'Visual', method: 'inspection', spec: { criteria: 'damage_free' } }
      ]
    },
    inProcess: {
      frequency: 'per_operation',
      characteristics: [
        { name: 'Process Parameters', method: 'automated', spec: { within_limits: true } },
        { name: 'Material Condition', method: 'inspection', spec: {} }
      ]
    },
    final: {
      frequency: 'per_batch',
      characteristics: [
        { name: 'Purity', method: 'ICP-OES', spec: { min: 0.99 } },
        { name: 'Moisture', method: 'KF_titration', spec: { max: 0.001 } },
        { name: 'Particle Size', method: 'laser_diffraction', spec: { d50: { min: 5, max: 15 } } }
      ]
    }
  },

  nonConformance: {
    severityLevels: ['minor', 'major', 'critical'],
    actions: ['rework', 'downgrade', 'scrap', 'investigate']
  }
};
```

## Integration with ERPNext

```typescript
// integration/erpnext-sync.ts
export const erpNextIntegration = {
  // Data flowing to ERPNext
  toERPNext: [
    {
      event: 'work_order_completed',
      action: 'create_stock_entry',
      mapping: {
        item_code: 'output_material',
        qty: 'output_quantity',
        from_warehouse: 'production_wip',
        to_warehouse: 'finished_goods'
      }
    },
    {
      event: 'material_consumed',
      action: 'create_stock_entry',
      mapping: {
        item_code: 'input_material',
        qty: 'consumed_quantity',
        from_warehouse: 'raw_materials',
        to_warehouse: 'work_in_progress'
      }
    },
    {
      event: 'quality_inspection_completed',
      action: 'create_quality_inspection',
      mapping: {
        inspection_type: 'In Process',
        reference_type: 'Work Order',
        readings: 'inspection_results'
      }
    }
  ],

  // Data receiving from ERPNext
  fromERPNext: [
    {
      doctype: 'Work Order',
      action: 'create_production_order',
      mapping: {
        item: 'production_item',
        qty: 'qty_to_manufacture',
        bom: 'bom_no'
      }
    },
    {
      doctype: 'Material Request',
      action: 'create_material_request',
      mapping: {
        items: 'materials_needed'
      }
    }
  ]
};
```

## Setup Instructions

1. **Import Workflows into Carbon:**
```bash
cd carbon/workflows
carbon workflow import inbound-processing.ts
carbon workflow import disassembly.ts
carbon workflow import material-recovery.ts
```

2. **Configure Traceability:**
```bash
carbon traceability configure traceability/config.ts
```

3. **Setup Quality Plans:**
```bash
carbon quality configure quality/config.ts
```

4. **Enable ERPNext Integration:**
```bash
carbon integration enable erpnext --config integration/erpnext-sync.ts
```
