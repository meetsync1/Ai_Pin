"""
ASR → LLM Pipeline Package
Audio transcription and LLM analysis pipeline.
"""

__version__ = "1.0.0"
__author__ = "Brij Kishore Pandey"
__description__ = "ASR to LLM Pipeline: Audio transcription with AI-powered analysis"

# Import main components for easy access
from src.pipeline import ASRLLMPipeline

from src.utils import (
    setup_logger,
    Metrics,
    Visualizer,
    Validator,
    AudioProcessor,
    Summarizer,
    LLMClient
)

__all__ = [
    # Pipeline
    'ASRLLMPipeline',
    
    # Utils
    'setup_logger',
    'Metrics',
    'Visualizer',
    'Validator',
    'AudioProcessor',
    'Summarizer',
    'LLMClient',
]
