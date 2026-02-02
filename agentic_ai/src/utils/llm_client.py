"""
LLM Client
Integrates various LLM providers (OpenAI, Anthropic, Hugging Face, Local models).
"""

from typing import Dict, List, Optional, Any
import logging
import os


class LLMClient:
    """
    Universal LLM client supporting multiple providers.
    """
    
    def __init__(
        self,
        provider: str = "openai",
        model: str = "gpt-4",
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        """
        Initialize LLM client.
        
        Args:
            provider: LLM provider ('openai', 'anthropic', 'huggingface', 'local')
            model: Model name
            api_key: API key (reads from env if not provided)
            temperature: Temperature for generation
            max_tokens: Maximum tokens in response
        """
        self.provider = provider.lower()
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.logger = logging.getLogger("utils.LLMClient")
        
        # Setup API key
        self.api_key = api_key or self._get_api_key()
        
        # Initialize provider client
        self.client = None
        self._initialize_client()
    
    def _get_api_key(self) -> Optional[str]:
        """Get API key from environment."""
        if self.provider == "openai":
            return os.getenv("OPENAI_API_KEY")
        elif self.provider == "anthropic":
            return os.getenv("ANTHROPIC_API_KEY")
        elif self.provider == "huggingface":
            return os.getenv("HUGGINGFACE_API_KEY")
        return None
    
    def _initialize_client(self):
        """Initialize the provider-specific client."""
        try:
            if self.provider == "openai":
                self._init_openai()
            elif self.provider == "anthropic":
                self._init_anthropic()
            elif self.provider == "huggingface":
                self._init_huggingface()
            elif self.provider == "local":
                self._init_local()
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
            
            self.logger.info(f"Initialized {self.provider} client with model {self.model}")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize {self.provider} client: {e}")
            self.logger.warning("LLM client will run in mock mode")
            self.client = None
    
    def _init_openai(self):
        """Initialize OpenAI client."""
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
        except ImportError:
            self.logger.error("openai package not installed. Run: pip install openai")
            raise
    
    def _init_anthropic(self):
        """Initialize Anthropic client."""
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key)
        except ImportError:
            self.logger.error("anthropic package not installed. Run: pip install anthropic")
            raise
    
    def _init_huggingface(self):
        """Initialize Hugging Face client."""
        try:
            from transformers import pipeline
            self.client = pipeline(
                "text-generation",
                model=self.model,
                device=0 if os.getenv("CUDA_VISIBLE_DEVICES") else -1
            )
        except ImportError:
            self.logger.error("transformers package not installed")
            raise
    
    def _init_local(self):
        """Initialize local model (Ollama, llama.cpp, etc)."""
        try:
            import requests
            self.client = "ollama"  # Placeholder
            self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        except ImportError:
            self.logger.error("requests package not installed")
            raise
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate response from LLM.
        
        Args:
            prompt: User prompt
            system_prompt: System prompt (optional)
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            
        Returns:
            Generated text response
        """
        temp = temperature if temperature is not None else self.temperature
        max_tok = max_tokens if max_tokens is not None else self.max_tokens
        
        self.logger.info(f"Generating response with {self.provider} ({self.model})")
        
        try:
            if self.provider == "openai":
                return self._generate_openai(prompt, system_prompt, temp, max_tok)
            elif self.provider == "anthropic":
                return self._generate_anthropic(prompt, system_prompt, temp, max_tok)
            elif self.provider == "huggingface":
                return self._generate_huggingface(prompt, system_prompt, temp, max_tok)
            elif self.provider == "local":
                return self._generate_local(prompt, system_prompt, temp, max_tok)
            else:
                return self._generate_mock(prompt)
                
        except Exception as e:
            self.logger.error(f"Generation failed: {e}")
            return f"Error: {str(e)}"
    
    def _generate_openai(self, prompt: str, system_prompt: Optional[str], temp: float, max_tok: int) -> str:
        """Generate with OpenAI."""
        if not self.client:
            return self._generate_mock(prompt)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temp,
            max_tokens=max_tok
        )
        
        return response.choices[0].message.content
    
    def _generate_anthropic(self, prompt: str, system_prompt: Optional[str], temp: float, max_tok: int) -> str:
        """Generate with Anthropic."""
        if not self.client:
            return self._generate_mock(prompt)
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tok,
            temperature=temp,
            system=system_prompt or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
    
    def _generate_huggingface(self, prompt: str, system_prompt: Optional[str], temp: float, max_tok: int) -> str:
        """Generate with Hugging Face."""
        if not self.client:
            return self._generate_mock(prompt)
        
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        result = self.client(
            full_prompt,
            max_new_tokens=max_tok,
            temperature=temp,
            do_sample=True
        )
        
        return result[0]['generated_text']
    
    def _generate_local(self, prompt: str, system_prompt: Optional[str], temp: float, max_tok: int) -> str:
        """Generate with local model (Ollama)."""
        import requests
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": system_prompt or "",
                    "temperature": temp,
                    "stream": False
                },
                timeout=60
            )
            response.raise_for_status()
            return response.json()["response"]
        except Exception as e:
            self.logger.error(f"Local generation failed: {e}")
            return self._generate_mock(prompt)
    
    def _generate_mock(self, prompt: str) -> str:
        """Mock generation for testing."""
        self.logger.warning("Using mock LLM response")
        return f"[Mock Response] I received your prompt: '{prompt[:50]}...' and would provide a helpful response if an LLM was configured."
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Multi-turn chat conversation.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            
        Returns:
            Generated response
        """
        temp = temperature if temperature is not None else self.temperature
        max_tok = max_tokens if max_tokens is not None else self.max_tokens
        
        if self.provider == "openai" and self.client:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temp,
                max_tokens=max_tok
            )
            return response.choices[0].message.content
        
        elif self.provider == "anthropic" and self.client:
            # Anthropic needs system prompt separate
            system = None
            user_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    system = msg["content"]
                else:
                    user_messages.append(msg)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tok,
                temperature=temp,
                system=system or "You are a helpful assistant.",
                messages=user_messages
            )
            return response.content[0].text
        
        else:
            # Fallback: use last user message
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            return self.generate(last_user_msg, temperature=temp, max_tokens=max_tok)
    
    def get_info(self) -> Dict[str, Any]:
        """Get client information."""
        return {
            'provider': self.provider,
            'model': self.model,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'initialized': self.client is not None
        }
