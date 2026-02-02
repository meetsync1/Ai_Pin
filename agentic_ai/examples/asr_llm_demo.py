"""
ASR→LLM Pipeline Demo
Simple demonstration of audio transcription to LLM processing.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.pipeline.asr_llm_pipeline import ASRLLMPipeline
from src.utils.logger import setup_logger


def main():
    """Run ASR→LLM pipeline demo."""
    
    # Setup logging
    logger = setup_logger(log_level="INFO")
    
    print("\n" + "="*70)
    print("🎙️  ASR → LLM PIPELINE DEMO")
    print("="*70)
    
    # Initialize pipeline
    print("\n📦 Initializing Pipeline...")
    print("-"*70)
    
    pipeline = ASRLLMPipeline(
        asr_model="unsloth/whisper-large-v3-turbo",  # Whisper for ASR
        llm_provider="openai",  # or "anthropic", "local", "huggingface"
        llm_model="gpt-4",  # or "claude-3-opus-20240229", "llama3", etc.
        device="auto"  # auto-detect GPU/CPU
    )
    
    # Example audio file path
    audio_file = r"D:\JOB\ML\udio.mp3"  # Change to your audio file
    
    if not os.path.exists(audio_file):
        print(f"\n⚠️  Audio file not found: {audio_file}")
        print("Please update the audio_file path in the script.")
        print("\nRunning with mock data for demonstration...")
        
        # Demo with mock text
        demo_with_text(pipeline)
    else:
        # Demo with real audio
        demo_with_audio(pipeline, audio_file)
    
    # Cleanup
    pipeline.cleanup()
    
    print("\n" + "="*70)
    print("✅ Demo Complete!")
    print("="*70 + "\n")


def demo_with_audio(pipeline: ASRLLMPipeline, audio_file: str):
    """Demo with actual audio file."""
    
    print("\n" + "="*70)
    print("DEMO 1: Basic Audio Processing")
    print("="*70)
    
    # Simple processing with default prompt
    result = pipeline.process_audio(
        audio_path=audio_file,
        language="english"
    )
    
    display_result(result)
    
    # Demo 2: Audio Summarization
    print("\n" + "="*70)
    print("DEMO 2: Audio Summarization")
    print("="*70)
    
    summary_result = pipeline.summarize_audio(
        audio_path=audio_file,
        num_sentences=3
    )
    
    print(f"\n📝 Transcription ({len(summary_result['transcription'])} chars):")
    print("-"*70)
    print(summary_result['transcription'][:300] + "...")
    
    print(f"\n✨ Summary:")
    print("-"*70)
    print(summary_result['summary'])
    print(f"\n⏱️  Total time: {summary_result['pipeline_time']:.2f}s")
    
    # Demo 3: Extract Insights
    print("\n" + "="*70)
    print("DEMO 3: Extract Insights")
    print("="*70)
    
    insights_result = pipeline.extract_insights(audio_path=audio_file)
    
    print(f"\n🔍 Insights:")
    print("-"*70)
    print(insights_result['insights'])
    
    # Demo 4: Custom Prompt
    print("\n" + "="*70)
    print("DEMO 4: Custom Analysis")
    print("="*70)
    
    custom_prompt = """Based on this transcription, answer these questions:
1. What is the main topic?
2. What are the key takeaways?
3. Is there any call to action?

Transcription: {transcript}

Analysis:"""
    
    custom_result = pipeline.process_audio(
        audio_path=audio_file,
        prompt_template=custom_prompt,
        system_prompt="You are a content analyst."
    )
    
    print(f"\n🎯 Custom Analysis:")
    print("-"*70)
    print(custom_result['llm_response'])


def demo_with_text(pipeline: ASRLLMPipeline):
    """Demo with text input (when audio not available)."""
    
    # Sample text simulating transcription
    sample_text = """
    Welcome to today's meeting. We're here to discuss the new AI-powered 
    voice assistant project. The main goals are to implement automatic speech 
    recognition using Whisper, integrate it with large language models for 
    intelligent responses, and create a user-friendly interface. 
    
    The timeline is three months, with the first milestone being the ASR 
    implementation in month one. We'll need to handle multiple languages 
    and ensure low latency for real-time conversations. 
    
    Action items: John will research LLM APIs, Sarah will prototype the 
    ASR pipeline, and Mike will work on the UI design. Next meeting is 
    scheduled for next Tuesday at 2 PM.
    """
    
    print("\n" + "="*70)
    print("TEXT DEMO: Processing Transcription")
    print("="*70)
    
    # Process text
    result = pipeline.process_text(
        text=sample_text,
        prompt_template="Summarize the following meeting transcription in 3 bullet points:\n\n{text}",
        system_prompt="You are a meeting summarizer."
    )
    
    print(f"\n📄 Input Text ({len(sample_text)} chars):")
    print("-"*70)
    print(sample_text.strip())
    
    print(f"\n🤖 LLM Response:")
    print("-"*70)
    print(result['llm_response'])


def display_result(result: dict):
    """Display pipeline result."""
    
    print(f"\n📊 Pipeline Results:")
    print("="*70)
    
    # Transcription
    transcript = result['transcription']['text']
    print(f"\n1️⃣  TRANSCRIPTION ({len(transcript)} chars)")
    print("-"*70)
    print(transcript[:400] + "..." if len(transcript) > 400 else transcript)
    
    # LLM Response
    print(f"\n2️⃣  LLM RESPONSE ({len(result['llm_response'])} chars)")
    print("-"*70)
    print(result['llm_response'])
    
    # Metadata
    print(f"\n3️⃣  METADATA")
    print("-"*70)
    print(f"ASR Model: {result['metadata']['asr_model']}")
    print(f"LLM Provider: {result['metadata']['llm_provider']}")
    print(f"LLM Model: {result['metadata']['llm_model']}")
    print(f"Audio Length: {result['transcription']['audio_length']:.2f}s")
    print(f"Pipeline Time: {result['pipeline_time']:.2f}s")


if __name__ == "__main__":
    main()
