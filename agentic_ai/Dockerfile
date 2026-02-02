# Dockerfile for Agentic AI Project
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create necessary directories
RUN mkdir -p data/logs data/memory data/checkpoints

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128

# Default command
CMD ["python", "examples/audio_summarization.py"]
