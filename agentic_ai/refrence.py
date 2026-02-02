#unsloth/whisper-large-v3-turbo - World-Class Accurate Transcription
#Optimized for RTX 3050 (4GB VRAM) with Maximum Accuracy

import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import librosa
import numpy as np
import gc
import os
from datetime import datetime
import time

# ==================== CONFIGURATION ====================
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

# Audio file path
AUDIO_FILE = r"D:\JOB\ML\udio.mp3"  # Change to your audio file path
# Transcription settings
LANGUAGE ="English"  # Set to None for auto-detection
TASK = "transcribe"  # "transcribe" or "translate" (to English)

# ==================== SETUP ====================
# Find the NVIDIA GPU (not the integrated AMD)
if torch.cuda.is_available():
    nvidia_gpu = None
    for i in range(torch.cuda.device_count()):
        name = torch.cuda.get_device_name(i)
        print(f"GPU {i}: {name}")
        if "NVIDIA" in name or "GeForce" in name or "RTX" in name:
            nvidia_gpu = i
            break
    
    if nvidia_gpu is not None:
        device = f"cuda:{nvidia_gpu}"
    else:
        device = "cuda:0"
else:
    device = "cpu"

torch_dtype = torch.float16 if "cuda" in device else torch.float32

print("=" * 60)
print("🎙️  WHISPER LARGE V3 TURBO - HIGH ACCURACY TRANSCRIPTION")
print("=" * 60)
print(f"Device: {device}")
if torch.cuda.is_available():
    gpu_idx = int(device.split(":")[1])
    print(f"GPU: {torch.cuda.get_device_name(gpu_idx)}")
    print(f"VRAM: {torch.cuda.get_device_properties(gpu_idx).total_memory / 1024**3:.2f} GB")
    torch.cuda.empty_cache()
    gc.collect()

# ==================== LOAD MODEL ====================
print("\n📦 Loading model...")
model_id = "unsloth/whisper-large-v3-turbo"

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id,
    torch_dtype=torch_dtype,
    low_cpu_mem_usage=True,
    use_safetensors=True,
    attn_implementation="sdpa"
)
model.to(device)
model.config.use_cache = True  # Enable KV cache for faster inference

processor = AutoProcessor.from_pretrained(model_id)
print("✓ Model loaded successfully!")

# ==================== AUDIO PREPROCESSING ====================
def preprocess_audio(audio_path, target_sr=16000):
    """
    Load and preprocess audio for optimal transcription quality.
    - Resample to 16kHz (Whisper's native sample rate)
    - Normalize audio levels
    """
    print(f"\n🎵 Loading audio: {os.path.basename(audio_path)}")
    
    # Load audio with librosa (handles various formats)
    # Use lower res_type to save RAM
    audio, sr = librosa.load(audio_path, sr=target_sr, mono=True, res_type='kaiser_fast')
    
    # Normalize audio to prevent clipping
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.95
    
    duration = len(audio) / target_sr
    print(f"✓ Audio duration: {duration:.2f} seconds ({duration/60:.2f} minutes)")
    print(f"✓ Audio RAM: {audio.nbytes / 1024**2:.1f} MB")
    
    return audio, target_sr

# ==================== TRANSCRIPTION ENGINE ====================
def transcribe_with_timestamps(audio, sr, language=None, task="transcribe"):
    """
    High-accuracy transcription using model's native generate method.
    Returns word-level timestamps for precise SRT generation.
    """
    print("\n🔄 Transcribing...")
    
    # Prepare input features
    inputs = processor(
        audio, 
        sampling_rate=sr, 
        return_tensors="pt",
        return_attention_mask=True
    )
    inputs = inputs.to(device, dtype=torch_dtype)
    
    # Generation parameters for maximum accuracy
    generate_kwargs = {
        "task": task,
        "return_timestamps": True,
        "num_beams": 1,  # Greedy decoding (avoids transformers bug)
        "condition_on_prev_tokens": True,  # Better context understanding
        "temperature": 0.0,  # Deterministic output (most accurate)
    }
    
    if language:
        generate_kwargs["language"] = language
    
    # Generate transcription
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            **generate_kwargs
        )
    
    # Decode output
    transcription = processor.batch_decode(outputs, skip_special_tokens=True, decode_with_timestamps=True)[0]
    
    return transcription, outputs

def extract_segments_with_timestamps(audio, sr, language=None, task="transcribe"):
    """
    Process long audio in segments for accurate timestamps.
    Uses Whisper's native 30-second window with proper handling.
    """
    print("\n🔄 Processing audio segments...")
    
    CHUNK_LENGTH = 30  # Whisper's native window size
    STRIDE = 0  # No overlap to save memory on 4GB GPU
    
    chunk_samples = CHUNK_LENGTH * sr
    
    segments = []
    current_pos = 0
    segment_num = 0
    
    total_chunks = max(1, int(np.ceil(len(audio) / chunk_samples)))
    
    while current_pos < len(audio):
        segment_num += 1
        end_pos = min(current_pos + chunk_samples, len(audio))
        chunk = audio[current_pos:end_pos]
        
        # Skip if chunk is too short
        if len(chunk) < sr:  # Less than 1 second
            break
        
        # Pad if chunk is shorter than 30s
        if len(chunk) < chunk_samples:
            chunk = np.pad(chunk, (0, chunk_samples - len(chunk)), mode='constant')
        
        print(f"  Processing segment {segment_num}/{total_chunks}...", flush=True)
        
        try:
            # Clear GPU memory before processing
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()
            
            # Process chunk
            inputs = processor(chunk, sampling_rate=sr, return_tensors="pt")
            input_features = inputs.input_features.to(device, dtype=torch_dtype)
            
            generate_kwargs = {
                "task": task,
                "return_timestamps": True,
                "num_beams": 1,
                "temperature": 0.0,
                "max_new_tokens": 440,  # Reduced to account for decoder_input_ids (448 - 8)
            }
            if language:
                generate_kwargs["language"] = language
            
            with torch.no_grad():
                outputs = model.generate(input_features, **generate_kwargs)
            
            # Decode with timestamps
            decoded = processor.decode(outputs[0], skip_special_tokens=False, decode_with_timestamps=True)
            
            # Parse timestamps from decoded output
            chunk_segments = parse_whisper_timestamps(decoded, current_pos / sr)
            segments.extend(chunk_segments)
            
            print(f"    ✓ Segment {segment_num} done ({len(chunk_segments)} phrases)", flush=True)
            
            # Clean up
            del inputs, input_features, outputs, decoded
            
        except Exception as e:
            print(f"\n    ⚠️ Segment {segment_num} failed: {e}", flush=True)
        
        finally:
            # Always clear GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()
        
        # Move to next position
        current_pos += chunk_samples
    
    print(f"\n✓ Processed {segment_num} segments, {len(segments)} total phrases")
    
    return segments

def parse_whisper_timestamps(decoded_text, time_offset=0):
    """Parse Whisper's timestamp tokens from decoded output."""
    import re
    
    segments = []
    # Match timestamp patterns like <|0.00|> text <|2.50|>
    pattern = r'<\|(\d+\.?\d*)\|>([^<]*)<\|(\d+\.?\d*)\|>'
    
    # Also try simpler pattern
    simple_pattern = r'<\|(\d+\.?\d*)\|>'
    
    matches = re.findall(pattern, decoded_text)
    
    if matches:
        for start, text, end in matches:
            text = text.strip()
            if text:
                segments.append({
                    'start': float(start) + time_offset,
                    'end': float(end) + time_offset,
                    'text': text
                })
    else:
        # Fallback: extract timestamps and text separately
        timestamps = re.findall(simple_pattern, decoded_text)
        text_parts = re.split(simple_pattern, decoded_text)
        text_parts = [t.strip() for t in text_parts if t.strip() and not t.replace('.', '').isdigit()]
        
        if timestamps and text_parts:
            for i, text in enumerate(text_parts):
                if i < len(timestamps):
                    start = float(timestamps[i]) + time_offset
                    end = float(timestamps[i + 1]) + time_offset if i + 1 < len(timestamps) else start + 3.0
                    segments.append({
                        'start': start,
                        'end': end,
                        'text': text
                    })
    
    return segments

def merge_overlapping_segments(segments):
    """Merge segments that overlap due to stride processing."""
    if not segments:
        return segments
    
    merged = [segments[0]]
    
    for seg in segments[1:]:
        last = merged[-1]
        
        # If overlap detected, merge or skip duplicate
        if seg['start'] < last['end']:
            # Check for duplicate text
            if seg['text'].strip() == last['text'].strip():
                continue
            # Adjust start time
            seg['start'] = last['end']
        
        if seg['start'] < seg['end']:
            merged.append(seg)
    
    return merged

# ==================== SRT GENERATION ====================
def format_srt_timestamp(seconds):
    """Convert seconds to SRT format: HH:MM:SS,mmm"""
    if seconds is None or seconds < 0:
        seconds = 0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def create_srt_file(segments, output_path):
    """Generate professional SRT subtitle file."""
    print(f"\n📝 Creating SRT file...")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, seg in enumerate(segments, 1):
            start = format_srt_timestamp(seg['start'])
            end = format_srt_timestamp(seg['end'])
            text = seg['text'].strip()
            
            if text:
                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
    
    print(f"✓ SRT saved: {output_path}")
    return output_path

def create_txt_file(segments, output_path):
    """Generate plain text transcription file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        full_text = ' '.join([seg['text'].strip() for seg in segments])
        f.write(full_text)
    print(f"✓ TXT saved: {output_path}")
    return output_path

# ==================== PIPELINE METHOD (ALTERNATIVE) ====================
def transcribe_with_pipeline(audio_file, language=None, task="transcribe"):
    """
    Use HuggingFace pipeline for simpler transcription.
    Good for shorter files or when memory is constrained.
    """
    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=device,
    )
    
    generate_kwargs = {
        "task": task,
        "num_beams": 5,
        "temperature": 0.0,
    }
    if language:
        generate_kwargs["language"] = language
    
    result = pipe(
        audio_file,
        return_timestamps="word",  # Word-level timestamps for accuracy
        generate_kwargs=generate_kwargs
    )
    
    return result

# ==================== MAIN EXECUTION ====================
def main():
    audio_file = AUDIO_FILE
    
    if not os.path.exists(audio_file):
        print(f"❌ Audio file not found: {audio_file}")
        return
    
    try:
        # Preprocess audio
        audio, sr = preprocess_audio(audio_file)
        
        # Start timing
        start_time = time.time()
        
        # Transcribe with segments
        segments = extract_segments_with_timestamps(
            audio, sr, 
            language=LANGUAGE, 
            task=TASK
        )
        
        # End timing
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        if not segments:
            print("\n⚠️ No segments detected, trying pipeline method...")
            result = transcribe_with_pipeline(audio_file, LANGUAGE, TASK)
            
            if 'chunks' in result:
                segments = [
                    {'start': c['timestamp'][0] or 0, 
                     'end': c['timestamp'][1] or c['timestamp'][0] + 2, 
                     'text': c['text']}
                    for c in result['chunks']
                ]
            else:
                segments = [{'start': 0, 'end': len(audio)/sr, 'text': result['text']}]
        
        # Generate output files
        base_name = audio_file.rsplit('.', 1)[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        srt_file = f"{base_name}_{timestamp}.srt"
        txt_file = f"{base_name}_{timestamp}.txt"
        
        create_srt_file(segments, srt_file)
        create_txt_file(segments, txt_file)
        
        # Print summary
        print("\n" + "=" * 60)
        print("✅ TRANSCRIPTION COMPLETE!")
        print("=" * 60)
        print(f"📄 SRT File: {srt_file}")
        print(f"📄 TXT File: {txt_file}")
        print(f"📊 Total Segments: {len(segments)}")
        print(f"⏱️  Audio Duration: {segments[-1]['end']:.2f}s" if segments else "")
        print(f"⏱️  Transcription Time: {elapsed_time:.2f}s ({elapsed_time/60:.2f} minutes)")
        print("\n📝 Preview:")
        print("-" * 40)
        preview_text = ' '.join([s['text'] for s in segments[:5]])[:500]
        print(preview_text + "..." if len(preview_text) >= 500 else preview_text)
        print("-" * 40)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

if __name__ == "__main__":
    main()