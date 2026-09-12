"""Vertex AI model factory. Single place to change provider."""
from __future__ import annotations

import os

from langchain_google_vertexai import ChatVertexAI


def reasoning_llm(temperature: float = 0.1) -> ChatVertexAI:
    return ChatVertexAI(
        model_name=os.environ.get("VERTEX_MODEL_REASONING", "gemini-2.5-pro"),
        project=os.environ["GCP_PROJECT_ID"],
        location=os.environ.get("GCP_LOCATION", "us-central1"),
        temperature=temperature,
    )


def fast_llm(temperature: float = 0.0) -> ChatVertexAI:
    return ChatVertexAI(
        model_name=os.environ.get("VERTEX_MODEL_FAST", "gemini-2.5-flash"),
        project=os.environ["GCP_PROJECT_ID"],
        location=os.environ.get("GCP_LOCATION", "us-central1"),
        temperature=temperature,
    )
