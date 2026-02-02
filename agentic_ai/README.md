# ASR → LLM Pipeline

**By: Brij Kishore Pandey**

Simple and powerful **Audio-to-LLM pipeline** for transcribing speech and processing it with Large Language Models.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 Main Use Case: ASR → LLM Pipeline

**Audio → Whisper (ASR) → LLM → Intelligent Response**

This system connects **Automatic Speech Recognition (Whisper)** with **Large Language Models** for intelligent audio processing.

### Key Features:

- 🎙️ **High-Accuracy ASR** using Whisper Large V3 Turbo
- 🤖 **Multi-LLM Support** - OpenAI, Anthropic, Hugging Face, Local (Ollama)
- ⚡ **Simple Pipeline** - Audio in, intelligent response out
- 💬 **Conversation Support** - Multi-turn chat with audio/text input
- 📝 **Smart Features** - Summarization, insights extraction, custom analysis
- 🔧 **Modular Design** - Easy to extend and customize

## 📁 Project Structure

```
agentic_ai_project/
├── config/                      # Configuration files
│   ├── main.yaml               # Main configuration
│   ├── agent_config.yaml       # Agent settings
│   ├── model_config.yaml       # Model configurations
│   ├── environment_config.yaml # Environment settings
│   └── logging_config.yaml     # Logging configuration
│
├── src/                        # Source code
│   ├── agents/                 # Agent implementations
│   │   ├── __init__.py
│   │   ├── base_agent.py       # Base agent class
│   │   ├── autonomous_agent.py # Autonomous agent
│   │   ├── learning_agent.py   # Learning agent (RL)
│   │   ├── reasoning_agent.py  # Reasoning agent
│   │   └── collaborative_agent.py # Collaborative agent
│   │
│   ├── core/                   # Core modules
│   │   ├── __init__.py
│   │   ├── memory.py           # Memory management
│   │   ├── reasoning.py        # Reasoning engine
│   │   ├── planner.py          # Planning system
│   │   ├── decision_maker.py   # Decision making
│   │   └── executor.py         # Task execution
│   │
│   ├── environment/            # Simulation environments
│   │   ├── __init__.py
│   │   ├── base_env.py         # Base environment
│   │   └── simulator.py        # Simulator
│   │
│   └── utils/                  # Utilities
│       ├── __init__.py
│       ├── logger.py           # Logging setup
│       ├── metrics.py          # Performance tracking
│       ├── visualizer.py       # Visualization tools
│       ├── validator.py        # Validation
│       ├── audio_processor.py  # Audio transcription ⭐
│       └── summarizer.py       # Text summarization ⭐
│
├── data/                       # Data directories
│   ├── memory/                 # Memory storage
│   ├── knowledge_base/         # Knowledge base
│   ├── training/               # Training data
│   ├── logs/                   # Log files
│   └── checkpoints/            # Model checkpoints
│
├── tests/                      # Unit tests
│   ├── __init__.py
│   ├── test_agents.py
│   ├── test_core.py
│   └── test_utils.py
│
├── examples/                   # Example scripts
│   ├── single_agent.py
│   ├── multi_agent.py
│   ├── reinforcement_learning.py
│   └── audio_summarization.py  # Main demo ⭐
│
├── refrence.py                 # Original Whisper implementation
├── requirements.txt            # Dependencies
├── pyproject.toml             # Project metadata
├── README.md                   # This file
└── Dockerfile                  # Docker configuration
```

## 🚀 Quick Start

### Installation

1. **Navigate to the project:**

```bash
cd agentic_ai
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Set up API keys:**

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
```

4. **Run the demo:**

```bash
python examples/asr_llm_demo.py
```

### Basic Usage

#### Simple ASR → LLM Pipeline

```python
from src.pipeline.asr_llm_pipeline import ASRLLMPipeline

# Initialize pipeline
pipeline = ASRLLMPipeline(
    asr_model="unsloth/whisper-large-v3-turbo",
    llm_provider="openai",  # or "anthropic", "local"
    llm_model="gpt-4"
)

# Process audio file
result = pipeline.process_audio(
    audio_path="your_audio.mp3",
    language="english"
)

print(result['transcription']['text'])  # Transcription
print(result['llm_response'])  # LLM analysis
```

#### Audio Summarization

```python
# Summarize audio content
summary = pipeline.summarize_audio(
    audio_path="your_audio.mp3",
    num_sentences=3
)

print(summary['summary'])
```

#### Extract Insights

```python
# Extract key insights from audio
insights = pipeline.extract_insights(
    audio_path="your_audio.mp3"
)

print(insights['insights'])
```

#### Conversational AI

```python
# Multi-turn conversation
conversation = []

# First turn with audio
result1 = pipeline.chat(
    audio_path="question1.mp3",
    conversation_history=conversation
)

# Second turn with text
result2 = pipeline.chat(
    text="Follow-up question",
    conversation_history=result1['conversation_history']
)
```

#### Using Agents

````python
from src.agents.autonomous_agent import AutonomousAgent
from src.environment.simulator import Simulator

# Create agent and environment
agent = AutonomousAgent("explorer", {'exploration_rate': 0.2})
env Main Demo: ASR → LLM Pipeline
```bash
python examples/asr_llm_demo.py
````

This demo includes:

- Basic audio processing
- Audio summarization
- Insight extraction
- Custom analysis prompts
- Text processing (when audio unavailable)

### Additional Examples (Optional)

````bash
# Original audio transcription demo
python eSR → LLM Pipeline (`src/pipeline/asr_llm_pipeline.py`)
Main pipeline connecting ASR to LLM:
- Process audio → transcribe → analyze with LLM
- Summarize audio content
- Extract insights and action items
- Multi-turn conversations
- Custom prompt templates

### 2. Audio Processor (`src/utils/audio_processor.py`)
High-accuracy ASR using Whisper:
- Whisper Large V3 Turbo model
- GPU acceleration with CPU fallback
- Segment-based processing for long audio
- Multiple output formats (text, SRT)

### 3. LLM Client (`src/utils/llm_client.py`)
Universal LLM integration:
- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude 3)
- **Hugging Face** (Open source models)
- **Local** (Ollama, llama.cpp)
- Automatic API key management
- Chat and completion modes
- Title generation
- Text statistics
- Conversation summarization

### 3. Agent Types

#### Base Agent
Foundation class with perceive-think-act cycle.

#### Autonomous Agent
Self-directed agent with goal generation and exploration.

#### Learning Agent
Reinforcement learning agent with Q-learning.

#### Reasoning Agent
Symbolic reasoning with logical inference and planning.

#### Collaborative Agent
Multi-agent coordination through message passing.

### 4. Core Modules

- **Memory**: Episodic, semantic, and procedural memory
- **Reasoning**: Forward/backward chaining inference
- **Planner**: Hierarchical task planning
- **Decision Maker**: Utility-based decision making
- **Executor**: Action execution and task management

## 🎓 Examples

### Audio Summarization
```bash
python examples/audio_summarization.py
````

### Single Agent

```bash
python examples/single_agent.py
```

### Multi-Agent Collaboration

```bash
python examples/multi_agent.py
```

### Reinforcement Learning

```bash
python examples/reinforcement_learning.py
```

## 🧪 Testing

Run all tests:

```bash
python tests/__init__.py
```

Run specific test suite:

```bash
python -m unittest tests.test_agents
python -m unittest tests.test_core
python -m unittest tests.test_utils
```

## 📝 Configuration

### Core Dependencies:

- Python 3.8+
- PyTorch 2.0+
- Transformers (Hugging Face)
- librosa (audio processing)
- OpenAI / Anthropic SDK (for LLMs)

### LLM API Keys:

Choose at least one:

- **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com)
- **Anthropic**: Get API key from [console.anthropic.com](https://console.anthropic.com)
- **Local Models**: Install [Ollama](https://ollama.ai) (free, no API key needed)\_config.yaml` - Model configurations (Whisper, etc.)
- `environment_config.yaml` - Environment settings
- `logging_config.yaml` - Logging configuration

## 🔧 Requirements

- Python 3.8+
- PyTorch
- Transformers (Hugging Face)
- librosa
- numpy
- PyYAML

See `requirements.txt` for full list.

## 📦 Installation (Advanced)

### Using Docker

### Primary Use Cases (ASR → LLM):

1. **Meeting Intelligence**
   - Transcribe meetings automatically
   - Extract action items and decisions
   - Generate meeting summaries
   - Identify key participants and topics

2. **Content Analysis**
   - Podcast summarization
   - Lecture/webinar notes
   - Interview analysis
   - Customer call insights

3. **Voice AI Applications**
   - Voice assistants with LLM intelligence
   - Interactive voice response (IVR)
   - Voice-based customer support
   - Accessibility tools

4. **Research & Documentation**
   - Interview transcription and analysis
   - Research note generation
   - Documentation from recordings
   - Data extraction from audio

### Additional Features (Optional):

5. **Agentic AI** (if you explore the agent modules)
   - Autonomous decision-making systems
   - Multi-agent coordination
   - Reinforcement learning agents
   - Podcast summarization
   - Meeting transcription and summary
   - Lecture notes generation
   - Interview summaries

6. **Autonomous Systems**
   - Self-directed agents
   - Multi-agent coordination
   - Adaptive learning systems

7. **Decision Support**
   - Logical reasoning
   - Planning and scheduling
   - Multi-criteria decision making

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📄 License

MIT License - see LICENSE file for details.

## 👤 Author

**Brij Kishore Pandey**

## 🙏 Acknowledgments

- Whisper model by OpenAI
- Unsloth for optimized Whisper implementation
- Hugging Face Transformers

## 📞 Support

For issues and questions, please open an issue on the repository.

---

**Note:** For audio transcription, the system is optimized for NVIDIA GPUs but works on CPU as well. Adjust `model_config.yaml` for your hardware configuration.
