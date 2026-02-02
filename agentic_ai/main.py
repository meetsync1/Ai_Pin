"""
Main Entry Point for ASR → LLM Pipeline
Process audio files through Whisper transcription and LLM analysis.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.utils.logger import setup_logger
import argparse


def main():
    """Main entry point for ASR→LLM pipeline."""
    parser = argparse.ArgumentParser(
        description="ASR → LLM Pipeline: Audio transcription with AI analysis"
    )
    parser.add_argument(
        '--audio',
        type=str,
        required=False,
        help='Path to audio file to process'
    )
    parser.add_argument(
        '--mode',
        type=str,
        default='demo',
        choices=['demo', 'process', 'summarize', 'insights', 'chat'],
        help='Processing mode: demo (run demo), process (basic transcription + LLM), summarize (summarize audio), insights (extract key points), chat (interactive)'
    )
    parser.add_argument(
        '--llm-provider',
        type=str,
        default='openai',
        choices=['openai', 'anthropic', 'huggingface', 'local'],
        help='LLM provider to use'
    )
    parser.add_argument(
        '--llm-model',
        type=str,
        help='LLM model name (e.g., gpt-4, claude-3-opus-20240229)'
    )
    parser.add_argument(
        '--config',
        type=str,
        default='config/main.yaml',
        help='Path to configuration file'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logger(log_level="INFO")
    logger.info(f"Starting ASR → LLM Pipeline in '{args.mode}' mode")
    
    # Run selected mode
    if args.mode == 'demo':
        # Run the demo script
        from examples.asr_llm_demo import main as demo_main
        demo_main()
    
    elif args.mode in ['process', 'summarize', 'insights', 'chat']:
        # Run pipeline with specific mode
        if not args.audio:
            logger.error("Error: --audio argument required for processing modes")
            logger.info("Use --mode demo to run demo without audio file")
            return
        
        from src.pipeline.asr_llm_pipeline import ASRLLMPipeline
        
        # Initialize pipeline
        pipeline = ASRLLMPipeline(
            llm_provider=args.llm_provider,
            llm_model=args.llm_model if args.llm_model else None
        )
        
        # Process based on mode
        if args.mode == 'process':
            result = pipeline.process_audio(args.audio)
            logger.info(f"\n{'='*60}")
            logger.info(f"Transcription:\n{result['transcription']['text']}")
            logger.info(f"\n{'='*60}")
            logger.info(f"LLM Response:\n{result['llm_response']}")
        
        elif args.mode == 'summarize':
            result = pipeline.summarize_audio(args.audio)
            logger.info(f"\n{'='*60}")
            logger.info(f"Summary:\n{result['summary']}")
        
        elif args.mode == 'insights':
            result = pipeline.extract_insights(args.audio)
            logger.info(f"\n{'='*60}")
            logger.info(f"Insights:\n{result['insights']}")
        
        elif args.mode == 'chat':
            logger.info("Interactive chat mode (not yet implemented)")
            logger.info("Use examples/asr_llm_demo.py for chat examples")
    
    logger.info("\n✓ Pipeline complete")


if __name__ == "__main__":
    main()
