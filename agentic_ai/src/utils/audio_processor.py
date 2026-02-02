"""
Audio Processor
Integrates Whisper for audio transcription and processing.
Based on reference implementation for high-accuracy transcription.
"""

import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import librosa
import numpy as np
import gc
import os
from datetime import datetime
import time
from typing import List, Dict, Optional, Tuple
import logging


class AudioProcessor:
    """
    Processes audio files for transcription and analysis using Whisper model.
    Optimized for GPU acceleration with fallback to CPU.
    """
    
    def __init__(self, model_id: str = "unsloth/whisper-large-v3-turbo", device: str = "auto"):
        """
        Initialize audio processor.
        
        Args:
            model_id: Hugging Face model ID
            device: Device to use ('cuda', 'cpu', or 'auto')
        """
        self.logger = logging.getLogger("utils.AudioProcessor")
        self.model_id = model_id
        
        # Setup device
        if device == "auto":
            self.device = self._get_best_device()
        else:
            self.device = device
        
        self.torch_dtype = torch.float16 if "cuda" in self.device else torch.float32
        
        self.logger.info(f"Initializing AudioProcessor on {self.device}")
        
        # Load model
        self.model = None
        self.processor = None
        self._load_model()
    
    def _get_best_device(self) -> str:
        """Detect best available device."""
        if torch.cuda.is_available():
            # Find NVIDIA GPU
            for i in range(torch.cuda.device_count()):
                name = torch.cuda.get_device_name(i)
                if "NVIDIA" in name or "GeForce" in name or "RTX" in name:
                    return f"cuda:{i}"
            return "cuda:0"
        return "cpu"
    
    def _load_model(self):
        """Load Whisper model."""
        try:
            self.logger.info(f"Loading model: {self.model_id}")
            
            self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
                self.model_id,
                torch_dtype=self.torch_dtype,
                low_cpu_mem_usage=True,
                use_safetensors=True,
                attn_implementation="sdpa"
            )
            self.model.to(self.device)
            self.model.config.use_cache = True
            
            self.processor = AutoProcessor.from_pretrained(self.model_id)
            
            self.logger.info("Model loaded successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to load model: {e}")
            raise
    
    def preprocess_audio(self, audio_path: str, target_sr: int = 16000) -> Tuple[np.ndarray, int]:
        """
        Load and preprocess audio file.
        
        Args:
            audio_path: Path to audio file
            target_sr: Target sample rate
            
        Returns:
            Tuple of (audio array, sample rate)
        """
        self.logger.info(f"Loading audio: {os.path.basename(audio_path)}")
        
        # Load audio
        audio, sr = librosa.load(audio_path, sr=target_sr, mono=True, res_type='kaiser_fast')
        
        # Normalize
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.95
        
        duration = len(audio) / target_sr
        self.logger.info(f"Audio duration: {duration:.2f}s")
        
        return audio, target_sr
    
    def transcribe(self, audio_path: str, language: str = "english", task: str = "transcribe") -> Dict:
        """
        Transcribe audio file to text.
        
        Args:
            audio_path: Path to audio file
            language: Language of audio
            task: 'transcribe' or 'translate'
            
        Returns:
            Dictionary with transcription results
        """
        self.logger.info(f"Transcribing: {audio_path}")
        start_time = time.time()
        
        # Preprocess audio
        audio, sr = self.preprocess_audio(audio_path)
        
        # Transcribe
        segments = self._transcribe_segments(audio, sr, language, task)
        
        # Compile results
        full_text = ' '.join([seg['text'].strip() for seg in segments])
        
        duration = time.time() - start_time
        
        result = {
            'text': full_text,
            'segments': segments,
            'duration': duration,
            'audio_length': len(audio) / sr,
            'language': language
        }
        
        self.logger.info(f"Transcription complete in {duration:.2f}s")
        
        return result
    
    def _transcribe_segments(self, audio: np.ndarray, sr: int, language: str, task: str) -> List[Dict]:
        """Transcribe audio in segments."""
        segments = []
        chunk_length = 30  # 30 seconds
        chunk_samples = chunk_length * sr
        
        current_pos = 0
        
        while current_pos < len(audio):
            end_pos = min(current_pos + chunk_samples, len(audio))
            chunk = audio[current_pos:end_pos]
            
            if len(chunk) < sr:  # Skip if less than 1 second
                break
            
            # Pad if necessary
            if len(chunk) < chunk_samples:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)), mode='constant')
            
            try:
                # Clear GPU memory
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    gc.collect()
                
                # Process chunk
                inputs = self.processor(chunk, sampling_rate=sr, return_tensors="pt")
                input_features = inputs.input_features.to(self.device, dtype=self.torch_dtype)
                
                generate_kwargs = {
                    "task": task,
                    "return_timestamps": True,
                    "num_beams": 1,
                    "temperature": 0.0,
                    "max_new_tokens": 440,
                }
                if language:
                    generate_kwargs["language"] = language
                
                with torch.no_grad():
                    outputs = self.model.generate(input_features, **generate_kwargs)
                
                # Decode
                text = self.processor.decode(outputs[0], skip_special_tokens=True)
                
                segments.append({
                    'start': current_pos / sr,
                    'end': end_pos / sr,
                    'text': text
                })
                
                del inputs, input_features, outputs
                
            except Exception as e:
                self.logger.error(f"Segment transcription failed: {e}")
            
            finally:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    gc.collect()
            
            current_pos += chunk_samples
        
        return segments
    
    def save_transcription(self, result: Dict, output_path: str, format: str = "txt"):
        """
        Save transcription to file.
        
        Args:
            result: Transcription result
            output_path: Output file path
            format: Output format ('txt' or 'srt')
        """
        if format == "txt":
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(result['text'])
        elif format == "srt":
            self._save_srt(result['segments'], output_path)
        
        self.logger.info(f"Transcription saved to: {output_path}")
    
    def _save_srt(self, segments: List[Dict], output_path: str):
        """Save segments as SRT file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, seg in enumerate(segments, 1):
                start = self._format_srt_time(seg['start'])
                end = self._format_srt_time(seg['end'])
                text = seg['text'].strip()
                
                if text:
                    f.write(f"{i}\n")
                    f.write(f"{start} --> {end}\n")
                    f.write(f"{text}\n\n")
    
    def _format_srt_time(self, seconds: float) -> str:
        """Format seconds to SRT timestamp."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def cleanup(self):
        """Cleanup resources."""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
