"""
curate.finetune_pipeline — Fine-Tuning Pipeline Integration
=============================================================

Integrates with axolotl and unsloth for fine-tuning small language models
on curated CFO domain data.  Generates the configuration files and shell
commands needed to run fine-tuning, without requiring either framework
to be installed.

The pipeline follows Pioneer Agent's closed-loop adaptation:
  1. Export curated training data from DataCurator
  2. Generate axolotl/unsloth configuration
  3. Run fine-tuning (or generate commands for manual execution)
  4. Evaluate with regression guard (94 tests + chaos engine)

Supported Base Models
---------------------
- Qwen2.5-7B-Instruct
- Llama-3.1-8B-Instruct
- Gemma-2-9B-Instruct
- Mistral-7B-Instruct-v0.3

Usage
-----
::

    pipeline = FinetunePipeline(
        config=FinetuneConfig(base_model="Qwen/Qwen2.5-7B-Instruct"),
        train_path="output/train.jsonl",
        eval_path="output/eval.jsonl",
    )
    pipeline.generate_axolotl_config("axolotl_config.yml")
    pipeline.generate_unsloth_script("finetune_unsloth.py")
    pipeline.generate_dockerfile("Dockerfile.finetune")
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("cfo_resilience.curate.finetune")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Known base models with their properties
_BASE_MODELS: dict[str, dict[str, Any]] = {
    "Qwen/Qwen2.5-7B-Instruct": {
        "framework": "both",
        "max_seq_length": 4096,
        "lora_r": 16,
        "lora_alpha": 32,
        "batch_size": 4,
        "gradient_accumulation": 4,
        "learning_rate": 2e-4,
        "epochs": 3,
        "warmup_ratio": 0.1,
    },
    "meta-llama/Meta-Llama-3.1-8B-Instruct": {
        "framework": "both",
        "max_seq_length": 4096,
        "lora_r": 16,
        "lora_alpha": 32,
        "batch_size": 4,
        "gradient_accumulation": 4,
        "learning_rate": 2e-4,
        "epochs": 3,
        "warmup_ratio": 0.1,
    },
    "google/gemma-2-9b-it": {
        "framework": "axolotl",
        "max_seq_length": 4096,
        "lora_r": 16,
        "lora_alpha": 32,
        "batch_size": 2,
        "gradient_accumulation": 8,
        "learning_rate": 1e-4,
        "epochs": 3,
        "warmup_ratio": 0.1,
    },
    "mistralai/Mistral-7B-Instruct-v0.3": {
        "framework": "both",
        "max_seq_length": 4096,
        "lora_r": 16,
        "lora_alpha": 32,
        "batch_size": 4,
        "gradient_accumulation": 4,
        "learning_rate": 2e-4,
        "epochs": 3,
        "warmup_ratio": 0.1,
    },
}


@dataclass
class FinetuneConfig:
    """Configuration for the fine-tuning pipeline.

    Attributes
    ----------
    base_model : str
        HuggingFace model identifier for the base model.
    output_dir : str
        Directory for fine-tuning outputs (checkpoints, final model).
    framework : str
        Fine-tuning framework: "axolotl", "unsloth", or "auto".
    max_seq_length : int
        Maximum sequence length for training.
    lora_r : int
        LoRA rank.
    lora_alpha : int
        LoRA alpha parameter.
    lora_dropout : float
        LoRA dropout rate.
    batch_size : int
        Per-device training batch size.
    gradient_accumulation_steps : int
        Gradient accumulation steps.
    learning_rate : float
        Peak learning rate.
    num_train_epochs : int
        Number of training epochs.
    warmup_ratio : float
        Fraction of steps for warmup.
    bf16 : bool
        Whether to use bf16 mixed precision.
    gradient_checkpointing : bool
        Whether to use gradient checkpointing.
    """

    base_model: str = "Qwen/Qwen2.5-7B-Instruct"
    output_dir: str = "./finetune_output"
    framework: str = "auto"
    max_seq_length: int = 4096
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    batch_size: int = 4
    gradient_accumulation_steps: int = 4
    learning_rate: float = 2e-4
    num_train_epochs: int = 3
    warmup_ratio: float = 0.1
    bf16: bool = True
    gradient_checkpointing: bool = True

    def __post_init__(self) -> None:
        """Apply base-model defaults for any unspecified values."""
        model_info = _BASE_MODELS.get(self.base_model, {})

        # Don't override explicitly set values
        for key, value in model_info.items():
            if key == "framework" and self.framework == "auto":
                self.framework = value
            elif key == "max_seq_length" and self.max_seq_length == 4096:
                self.max_seq_length = value
            elif key == "lora_r" and self.lora_r == 16:
                self.lora_r = value
            elif key == "lora_alpha" and self.lora_alpha == 32:
                self.lora_alpha = value
            elif key == "batch_size" and self.batch_size == 4:
                self.batch_size = value
            elif key == "gradient_accumulation" and self.gradient_accumulation_steps == 4:
                self.gradient_accumulation_steps = value
            elif key == "learning_rate" and self.learning_rate == 2e-4:
                self.learning_rate = value
            elif key == "epochs" and self.num_train_epochs == 3:
                self.num_train_epochs = value
            elif key == "warmup_ratio" and self.warmup_ratio == 0.1:
                self.warmup_ratio = value

        # Auto-select framework if needed
        if self.framework == "auto":
            self.framework = "unsloth"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Finetune Pipeline
# ---------------------------------------------------------------------------


class FinetunePipeline:
    """Generates fine-tuning configurations and scripts.

    This pipeline does NOT execute fine-tuning itself — it generates the
    configuration files and scripts that can be used with axolotl or
    unsloth.  This keeps the dependency footprint minimal.

    Parameters
    ----------
    config : FinetuneConfig
        Fine-tuning configuration.
    train_path : str | Path
        Path to the training data JSONL file.
    eval_path : str | Path | None
        Path to the eval data JSONL file.
    regression_path : str | Path | None
        Path to the regression test data JSONL file.
    """

    def __init__(
        self,
        config: FinetuneConfig,
        train_path: str | Path,
        eval_path: str | Path | None = None,
        regression_path: str | Path | None = None,
    ) -> None:
        self._config = config
        self._train_path = Path(train_path)
        self._eval_path = Path(eval_path) if eval_path else None
        self._regression_path = Path(regression_path) if regression_path else None
        self._created_at = datetime.now(timezone.utc).isoformat()

    def generate_axolotl_config(self, output_path: str | Path) -> Path:
        """Generate an axolotl YAML configuration file.

        Parameters
        ----------
        output_path : str | Path
            Where to write the configuration file.

        Returns
        -------
        Path
            The path to the generated configuration file.
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Determine chat template based on model
        chat_template = "chatml"
        if "llama" in self._config.base_model.lower():
            chat_template = "llama3"
        elif "qwen" in self._config.base_model.lower():
            chat_template = "qwen2.5"
        elif "gemma" in self._config.base_model.lower():
            chat_template = "gemma"
        elif "mistral" in self._config.base_model.lower():
            chat_template = "mistral"

        config = {
            "base_model": self._config.base_model,
            "model_type": "AutoModelForCausalLM",
            "tokenizer_type": "AutoTokenizer",
            "load_in_8bit": False,
            "load_in_4bit": True,
            "bf16": self._config.bf16,
            "chat_template": chat_template,
            "datasets": [
                {
                    "path": str(self._train_path),
                    "type": "chat",
                    "shard_size": 1000,
                },
            ],
            "output_dir": self._config.output_dir,
            "sequence_length": self._config.max_seq_length,
            "sample_packing": True,
            "pad_to_sequence_len": True,
            "adapter": "lora",
            "lora_r": self._config.lora_r,
            "lora_alpha": self._config.lora_alpha,
            "lora_dropout": self._config.lora_dropout,
            "lora_target_linear": True,
            "gradient_accumulation_steps": self._config.gradient_accumulation_steps,
            "micro_batch_size": self._config.batch_size,
            "num_epochs": self._config.num_train_epochs,
            "warmup_ratio": self._config.warmup_ratio,
            "learning_rate": self._config.learning_rate,
            "optimizer": "adamw_torch",
            "lr_scheduler": "cosine",
            "gradient_checkpointing": self._config.gradient_checkpointing,
            "eval_steps": 50,
            "save_steps": 100,
            "save_total_limit": 3,
            "logging_steps": 10,
            "val_set_size": 0.05 if not self._eval_path else 0.0,
            "eval_table_size": 5,
            "special_tokens": {
                "bos_token": "<s>",
                "eos_token": "</s>",
                "unk_token": "<unk>",
            },
            "tags": ["cfo-resilience-matrix", "axolotl"],
        }

        # Add eval set if provided
        if self._eval_path:
            config["datasets"].append({
                "path": str(self._eval_path),
                "type": "chat",
                "split": "validation",
            })

        # Write YAML (using json with yaml-like formatting for portability)
        with open(output_path, "w") as f:
            f.write("# Auto-generated axolotl config for CFO Resilience Matrix\n")
            f.write(f"# Generated: {self._created_at}\n")
            f.write(f"# Base model: {self._config.base_model}\n")
            f.write(f"# Framework: axolotl\n\n")
            f.write("# Run with: accelerate launch -m axolotl.cli.train this_file.yml\n\n")
            f.write(self._dict_to_yaml(config))

        logger.info("Generated axolotl config: %s", output_path)
        return output_path

    def generate_unsloth_script(self, output_path: str | Path) -> Path:
        """Generate an unsloth fine-tuning Python script.

        Parameters
        ----------
        output_path : str | Path
            Where to write the script.

        Returns
        -------
        Path
            The path to the generated script.
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        eval_section = ""
        if self._eval_path:
            eval_section = f'''
# Load eval dataset
eval_dataset = dataset_lib.load_dataset("json", data_files={str(self._eval_path)!r}, split="train")
eval_dataset = format_dataset(eval_dataset)

# Run evaluation
trainer.evaluate(eval_dataset=eval_dataset)
'''

        regression_section = ""
        if self._regression_path:
            regression_section = f'''
# Load regression test set
regression_dataset = dataset_lib.load_dataset("json", data_files={str(self._regression_path)!r}, split="train")
regression_dataset = format_dataset(regression_dataset)

# Run regression evaluation (must pass all)
reg_results = trainer.evaluate(eval_dataset=regression_dataset)
print(f"Regression results: {{reg_results}}")
'''

        script = f'''#!/usr/bin/env python3
"""
Auto-generated unsloth fine-tuning script for CFO Resilience Matrix.
Generated: {self._created_at}
Base model: {self._config.base_model}
Framework: unsloth
"""

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset as dataset_lib
from trl import SFTTrainer
from transformers import TrainingArguments

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MAX_SEQ_LENGTH = {self._config.max_seq_length}
DTYPE = None  # Auto-detect
LOAD_IN_4BIT = True

BASE_MODEL = "{self._config.base_model}"
TRAIN_PATH = "{self._train_path}"
OUTPUT_DIR = "{self._config.output_dir}"

LORA_R = {self._config.lora_r}
LORA_ALPHA = {self._config.lora_alpha}
LORA_DROPOUT = {self._config.lora_dropout}

BATCH_SIZE = {self._config.batch_size}
GRADIENT_ACCUMULATION = {self._config.gradient_accumulation_steps}
LEARNING_RATE = {self._config.learning_rate}
NUM_EPOCHS = {self._config.num_train_epochs}
WARMUP_RATIO = {self._config.warmup_ratio}

# ---------------------------------------------------------------------------
# Load model
# ---------------------------------------------------------------------------
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=DTYPE,
    load_in_4bit=LOAD_IN_4BIT,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj"],
    bias="none",
        use_gradient_checkpointing="unsloth",
    random_state=42,
    use_rslora=False,
    loftq_config=None,
)

FastLanguageModel.for_inference(model)  # Enable native 2x faster inference

# ---------------------------------------------------------------------------
# Load dataset
# ---------------------------------------------------------------------------
def format_dataset(dataset):
    """Format dataset into chat template."""
    def formatting_prompts_func(examples):
        convos = examples["messages"]
        texts = []
        mapper = {{"role": "system": "System", "role": "user": "User", "role": "assistant": "Assistant"}}
        for convo in convos:
            text = ""
            for msg in convo:
                role = mapper.get(msg["role"], msg["role"])
                content = msg["content"]
                text += f"<|im_start|>{{role}}\\n{{content}}<|im_end|>\\n"
            texts.append(text)
        return {{"text": texts}}
    return dataset.map(formatting_prompts_func, batched=True)

train_dataset = dataset_lib.load_dataset("json", data_files=TRAIN_PATH, split="train")
train_dataset = format_dataset(train_dataset)

# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    packing=False,
    args=TrainingArguments(
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION,
        warmup_ratio=WARMUP_RATIO,
        num_train_epochs=NUM_EPOCHS,
        learning_rate=LEARNING_RATE,
        bf16=True,
        logging_steps=10,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        seed=42,
        output_dir=OUTPUT_DIR,
        report_to="none",
    ),
)

trainer_stats = trainer.train()
print(f"Training stats: {{trainer_stats}}")

# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
{eval_section}
{regression_section}

# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------
model.save_pretrained(f"{{OUTPUT_DIR}}/lora_adapter")
tokenizer.save_pretrained(f"{{OUTPUT_DIR}}/lora_adapter")

# Save merged model (optional — requires more memory)
# model.save_pretrained_merged(f"{{OUTPUT_DIR}}/merged", tokenizer, save_method="merged_16bit")

print("Fine-tuning complete! Adapter saved to:", f"{{OUTPUT_DIR}}/lora_adapter")
'''

        with open(output_path, "w") as f:
            f.write(script)

        logger.info("Generated unsloth script: %s", output_path)
        return output_path

    def generate_dockerfile(self, output_path: str | Path) -> Path:
        """Generate a Dockerfile for the fine-tuning environment.

        Parameters
        ----------
        output_path : str | Path
            Where to write the Dockerfile.

        Returns
        -------
        Path
            The path to the generated Dockerfile.
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        dockerfile = f'''# CFO Resilience Matrix — Fine-Tuning Environment
# Auto-generated: {self._created_at}
# Base model: {self._config.base_model}

FROM unsloth/unsloth:latest

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \\
    trl \\
    peft \\
    datasets \\
    accelerate \\
    bitsandbytes

# Copy training data
COPY train.jsonl /app/train.jsonl
COPY eval.jsonl /app/eval.jsonl

# Copy the training script
COPY finetune_unsloth.py /app/finetune_unsloth.py

# Run fine-tuning
CMD ["python", "finetune_unsloth.py"]
'''

        with open(output_path, "w") as f:
            f.write(dockerfile)

        logger.info("Generated Dockerfile: %s", output_path)
        return output_path

    def generate_run_commands(self) -> dict[str, str]:
        """Generate shell commands for running fine-tuning.

        Returns
        -------
        dict[str, str]
            Command descriptions and their shell commands.
        """
        return {
            "install_unsloth": "pip install unsloth",
            "install_axolotl": "pip install axolotl",
            "run_axolotl": f"accelerate launch -m axolotl.cli.train axolotl_config.yml",
            "run_unsloth": f"python finetune_unsloth.py",
            "run_docker": (
                f"docker build -t cfo-finetune -f Dockerfile.finetune . && "
                f"docker run --gpus all -v ./finetune_output:/app/finetune_output cfo-finetune"
            ),
            "run_tests": (
                f"cd /app && PYTHONPATH=src pytest tests/ -v "
                f"# Regression guard: 94 tests must pass after fine-tuning"
            ),
            "run_chaos_eval": (
                f"PYTHONPATH=src python demo.py --fast "
                f"# Chaos engine evaluation against fine-tuned model"
            ),
        }

    def get_pipeline_info(self) -> dict[str, Any]:
        """Return information about the pipeline configuration."""
        return {
            "base_model": self._config.base_model,
            "framework": self._config.framework,
            "train_path": str(self._train_path),
            "eval_path": str(self._eval_path) if self._eval_path else None,
            "regression_path": str(self._regression_path) if self._regression_path else None,
            "config": self._config.to_dict(),
            "created_at": self._created_at,
        }

    @staticmethod
    def _dict_to_yaml(d: dict[str, Any], indent: int = 0) -> str:
        """Simple dict-to-YAML converter (no PyYAML dependency)."""
        lines: list[str] = []
        for key, value in d.items():
            prefix = "  " * indent
            if isinstance(value, dict):
                lines.append(f"{prefix}{key}:")
                lines.append(FinetunePipeline._dict_to_yaml(value, indent + 1))
            elif isinstance(value, list):
                lines.append(f"{prefix}{key}:")
                for item in value:
                    if isinstance(item, dict):
                        lines.append(f"{prefix}  -")
                        lines.append(FinetunePipeline._dict_to_yaml(item, indent + 2))
                    else:
                        lines.append(f"{prefix}  - {item}")
            elif isinstance(value, bool):
                lines.append(f"{prefix}{key}: {'true' if value else 'false'}")
            elif isinstance(value, (int, float)):
                lines.append(f"{prefix}{key}: {value}")
            else:
                lines.append(f'{prefix}{key}: "{value}"')
        return "\n".join(lines)

    def __repr__(self) -> str:
        return (
            f"FinetunePipeline(model={self._config.base_model}, "
            f"framework={self._config.framework})"
        )
