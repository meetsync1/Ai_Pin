"""
ASR to LLM Pipeline
Main pipeline connecting audio transcription to LLM processing.
"""

from typing import Dict, Optional, Any, List
import logging
import time
from pathlib import Path

from src.utils.audio_processor import AudioProcessor
from src.utils.llm_client import LLMClient


class ASRLLMPipeline:
    """
    End-to-end pipeline: Audio → ASR (Whisper) → LLM → Response
    """
    
    def __init__(
        self,
        asr_model: str = "unsloth/whisper-large-v3-turbo",
        llm_provider: str = "openai",
        llm_model: str = "gpt-4",
        device: str = "auto"
    ):
        """
        Initialize ASR→LLM pipeline.
        
        Args:
            asr_model: Whisper model ID
            llm_provider: LLM provider ('openai', 'anthropic', 'local')
            llm_model: LLM model name
            device: Device for ASR ('cuda', 'cpu', 'auto')
        """
        self.logger = logging.getLogger("pipeline.ASRLLMPipeline")
        
        # Initialize components
        self.logger.info("Initializing ASR→LLM Pipeline...")
        
        # ASR (Whisper)
        self.logger.info(f"Loading ASR model: {asr_model}")
        self.asr = AudioProcessor(model_id=asr_model, device=device)
        
        # LLM
        self.logger.info(f"Loading LLM: {llm_provider}/{llm_model}")
        self.llm = LLMClient(provider=llm_provider, model=llm_model)
        
        self.logger.info("✓ Pipeline initialized successfully")
    
    def process_audio(
        self,
        audio_path: str,
        prompt_template: Optional[str] = None,
        system_prompt: Optional[str] = None,
        language: str = "english"
    ) -> Dict[str, Any]:
        """
        Process audio file through ASR→LLM pipeline.
        
        Args:
            audio_path: Path to audio file
            prompt_template: Template for LLM prompt (use {transcript} placeholder)
            system_prompt: System prompt for LLM
            language: Audio language
            
        Returns:
            Dictionary with transcription, prompt, and LLM response
        """
        self.logger.info("="*60)
        self.logger.info(f"Processing: {Path(audio_path).name}")
        self.logger.info("="*60)
        
        start_time = time.time()
        
        # Step 1: Transcribe audio (ASR)
        self.logger.info("\n[1/3] 🎙️  Transcribing audio...")
        transcription_result = self.asr.transcribe(
            audio_path,
            language=language,
            task="transcribe"
        )
        transcript = transcription_result['text']
        
        self.logger.info(f"✓ Transcription complete ({len(transcript)} chars)")
        self.logger.info(f"Preview: {transcript[:200]}...")
        
        # Step 2: Prepare LLM prompt
        self.logger.info("\n[2/3] 📝 Preparing LLM prompt...")
        if prompt_template:
            prompt = prompt_template.format(transcript=transcript)
        else:
            prompt = f"Please analyze the following transcription:\n\n{transcript}"
        
        self.logger.info(f"Prompt prepared ({len(prompt)} chars)")
        
        # Step 3: Get LLM response
        self.logger.info("\n[3/3] 🤖 Generating LLM response...")
        llm_response = self.llm.generate(
            prompt=prompt,
            system_prompt=system_prompt
        )
        
        self.logger.info(f"✓ Response generated ({len(llm_response)} chars)")
        
        # Results
        total_time = time.time() - start_time
        
        result = {
            'audio_file': audio_path,
            'transcription': {
                'text': transcript,
                'segments': transcription_result.get('segments', []),
                'duration': transcription_result.get('duration', 0),
                'audio_length': transcription_result.get('audio_length', 0),
            },
            'llm_prompt': prompt,
            'llm_response': llm_response,
            'pipeline_time': total_time,
            'metadata': {
                'asr_model': self.asr.model_id,
                'llm_provider': self.llm.provider,
                'llm_model': self.llm.model
            }
        }
        
        self.logger.info(f"\n✅ Pipeline complete in {total_time:.2f}s")
        
        return result
    
    def process_text(
        self,
        text: str,
        prompt_template: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process text directly through LLM (skip ASR).
        
        Args:
            text: Input text
            prompt_template: Template for LLM prompt
            system_prompt: System prompt for LLM
            
        Returns:
            Dictionary with prompt and LLM response
        """
        self.logger.info("Processing text through LLM...")
        
        # Prepare prompt
        if prompt_template:
            prompt = prompt_template.format(text=text, transcript=text)
        else:
            prompt = text
        
        # Get LLM response
        llm_response = self.llm.generate(
            prompt=prompt,
            system_prompt=system_prompt
        )
        
        result = {
            'input_text': text,
            'llm_prompt': prompt,
            'llm_response': llm_response,
            'metadata': {
                'llm_provider': self.llm.provider,
                'llm_model': self.llm.model
            }
        }
        
        return result
    
    def chat(
        self,
        audio_path: Optional[str] = None,
        text: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None,
        language: str = "english"
    ) -> Dict[str, Any]:
        """
        Multi-turn conversation with audio or text input.
        
        Args:
            audio_path: Path to audio file (if audio input)
            text: Text input (if text input)
            conversation_history: Previous conversation messages
            system_prompt: System prompt for conversation
            language: Audio language
            
        Returns:
            Dictionary with updated conversation
        """
        messages = conversation_history or []
        
        # Add system prompt if first message
        if not messages and system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # Get user input (from audio or text)
        if audio_path:
            self.logger.info("Transcribing audio for chat...")
            transcription = self.asr.transcribe(audio_path, language=language)
            user_input = transcription['text']
        elif text:
            user_input = text
        else:
            raise ValueError("Either audio_path or text must be provided")
        
        # Add user message
        messages.append({"role": "user", "content": user_input})
        
        # Get LLM response
        response = self.llm.chat(messages)
        
        # Add assistant response
        messages.append({"role": "assistant", "content": response})
        
        result = {
            'user_input': user_input,
            'assistant_response': response,
            'conversation_history': messages
        }
        
        return result
    
    def summarize_audio(
        self,
        audio_path: str,
        num_sentences: int = 5,
        language: str = "english"
    ) -> Dict[str, Any]:
        """
        Summarize audio content using LLM.
        
        Args:
            audio_path: Path to audio file
            num_sentences: Target number of sentences in summary
            language: Audio language
            
        Returns:
            Dictionary with transcription and summary
        """
        prompt_template = """Please provide a concise summary of the following transcription in approximately {num_sentences} sentences. Focus on the main points and key information.

Transcription:
{transcript}

Summary:"""
        
        result = self.process_audio(
            audio_path=audio_path,
            prompt_template=prompt_template.format(num_sentences=num_sentences, transcript="{transcript}"),
            system_prompt="You are a helpful assistant that creates clear, concise summaries.",
            language=language
        )
        
        return {
            'audio_file': audio_path,
            'transcription': result['transcription']['text'],
            'summary': result['llm_response'],
            'pipeline_time': result['pipeline_time']
        }
    
    def extract_insights(
        self,
        audio_path: str,
        language: str = "english"
    ) -> Dict[str, Any]:
        """
        Extract key insights and action items from audio.
        
        Args:
            audio_path: Path to audio file
            language: Audio language
            
        Returns:
            Dictionary with insights
        """
        prompt_template = """Analyze the following transcription and provide:
1. Key Points (3-5 main ideas)
2. Action Items (if any)
3. Important Dates/Numbers (if mentioned)
4. Overall Theme/Topic

Transcription:
{transcript}

Analysis:"""
        
        result = self.process_audio(
            audio_path=audio_path,
            prompt_template=prompt_template,
            system_prompt="You are an analytical assistant that extracts structured insights from text.",
            language=language
        )
        
        return {
            'audio_file': audio_path,
            'transcription': result['transcription']['text'],
            'insights': result['llm_response'],
            'pipeline_time': result['pipeline_time']
        }
    
    def cleanup(self):
        """Cleanup resources."""
        if hasattr(self.asr, 'cleanup'):
            self.asr.cleanup()
        self.logger.info("Pipeline cleaned up")
