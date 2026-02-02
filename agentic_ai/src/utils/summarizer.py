"""
Summarizer
Main utility for generating summaries from text, audio, and other content.
This is the core feature of the application.
"""

from typing import List, Dict, Optional, Any
import re
import logging


class Summarizer:
    """
    Generates summaries from various content types.
    Supports extractive and abstractive summarization.
    """
    
    def __init__(self, method: str = "extractive", max_length: int = 500):
        """
        Initialize summarizer.
        
        Args:
            method: Summarization method ('extractive' or 'abstractive')
            max_length: Maximum summary length in characters
        """
        self.method = method
        self.max_length = max_length
        self.logger = logging.getLogger("utils.Summarizer")
    
    def summarize_text(self, text: str, num_sentences: int = 3) -> str:
        """
        Generate summary from text.
        
        Args:
            text: Input text to summarize
            num_sentences: Number of sentences in summary
            
        Returns:
            Summary text
        """
        self.logger.info(f"Summarizing text ({len(text)} chars)")
        
        if self.method == "extractive":
            summary = self._extractive_summarize(text, num_sentences)
        else:
            summary = self._abstractive_summarize(text, num_sentences)
        
        # Ensure summary is within max length
        if len(summary) > self.max_length:
            summary = summary[:self.max_length] + "..."
        
        self.logger.info(f"Summary generated ({len(summary)} chars)")
        
        return summary
    
    def _extractive_summarize(self, text: str, num_sentences: int) -> str:
        """
        Extractive summarization - select most important sentences.
        
        Args:
            text: Input text
            num_sentences: Number of sentences to extract
            
        Returns:
            Summary text
        """
        # Split into sentences
        sentences = self._split_sentences(text)
        
        if len(sentences) <= num_sentences:
            return text
        
        # Score sentences based on multiple criteria
        scored_sentences = []
        
        # Calculate word frequencies
        word_freq = self._calculate_word_frequencies(text)
        
        for i, sentence in enumerate(sentences):
            score = self._score_sentence(sentence, word_freq, i, len(sentences))
            scored_sentences.append((score, sentence))
        
        # Sort by score and select top sentences
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        top_sentences = [sent for score, sent in scored_sentences[:num_sentences]]
        
        # Maintain original order
        summary_sentences = []
        for sentence in sentences:
            if sentence in top_sentences:
                summary_sentences.append(sentence)
        
        return ' '.join(summary_sentences)
    
    def _abstractive_summarize(self, text: str, num_sentences: int) -> str:
        """
        Abstractive summarization - generate new summary.
        Note: This is a simplified version. Full implementation would use transformer models.
        
        Args:
            text: Input text
            num_sentences: Target number of sentences
            
        Returns:
            Summary text
        """
        # For now, use extractive as fallback
        # In production, this would use a model like BART, T5, or GPT
        self.logger.warning("Abstractive summarization not fully implemented, using extractive")
        return self._extractive_summarize(text, num_sentences)
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitter
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences
    
    def _calculate_word_frequencies(self, text: str) -> Dict[str, float]:
        """Calculate normalized word frequencies."""
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Count frequencies
        freq = {}
        for word in words:
            if len(word) > 3:  # Ignore short words
                freq[word] = freq.get(word, 0) + 1
        
        # Normalize
        max_freq = max(freq.values()) if freq else 1
        for word in freq:
            freq[word] = freq[word] / max_freq
        
        return freq
    
    def _score_sentence(self, sentence: str, word_freq: Dict[str, float], position: int, total: int) -> float:
        """
        Score sentence based on multiple criteria.
        
        Args:
            sentence: Sentence to score
            word_freq: Word frequency dictionary
            position: Position in document
            total: Total number of sentences
            
        Returns:
            Score (higher is better)
        """
        score = 0.0
        words = re.findall(r'\b\w+\b', sentence.lower())
        
        # Word frequency score
        freq_score = sum(word_freq.get(word, 0) for word in words)
        score += freq_score
        
        # Position score (favor beginning and end)
        if position < 3:
            score += 2.0
        elif position >= total - 2:
            score += 1.5
        
        # Length score (penalize very short/long sentences)
        word_count = len(words)
        if 10 <= word_count <= 30:
            score += 1.0
        elif word_count < 5:
            score -= 1.0
        
        return score
    
    def summarize_audio_transcription(self, transcription_result: Dict, num_sentences: int = 5) -> Dict:
        """
        Summarize audio transcription.
        
        Args:
            transcription_result: Result from AudioProcessor
            num_sentences: Number of sentences in summary
            
        Returns:
            Summary result with metadata
        """
        text = transcription_result.get('text', '')
        
        summary = self.summarize_text(text, num_sentences)
        
        result = {
            'summary': summary,
            'original_length': len(text),
            'summary_length': len(summary),
            'compression_ratio': len(summary) / len(text) if text else 0,
            'audio_duration': transcription_result.get('audio_length', 0),
            'method': self.method
        }
        
        return result
    
    def summarize_conversation(self, messages: List[Dict], max_summary_length: int = 300) -> str:
        """
        Summarize a conversation/dialogue.
        
        Args:
            messages: List of message dictionaries with 'speaker' and 'text'
            max_summary_length: Maximum summary length
            
        Returns:
            Conversation summary
        """
        # Extract key points from conversation
        all_text = ' '.join([msg.get('text', '') for msg in messages])
        
        # Generate summary
        summary = self.summarize_text(all_text, num_sentences=3)
        
        # Add conversation context
        num_speakers = len(set(msg.get('speaker', 'unknown') for msg in messages))
        
        context = f"Conversation with {num_speakers} participants. "
        full_summary = context + summary
        
        if len(full_summary) > max_summary_length:
            full_summary = full_summary[:max_summary_length] + "..."
        
        return full_summary
    
    def extract_key_points(self, text: str, num_points: int = 5) -> List[str]:
        """
        Extract key points from text.
        
        Args:
            text: Input text
            num_points: Number of key points to extract
            
        Returns:
            List of key points
        """
        sentences = self._split_sentences(text)
        word_freq = self._calculate_word_frequencies(text)
        
        # Score sentences
        scored = []
        for i, sentence in enumerate(sentences):
            score = self._score_sentence(sentence, word_freq, i, len(sentences))
            scored.append((score, sentence))
        
        # Get top sentences
        scored.sort(reverse=True, key=lambda x: x[0])
        key_points = [sent for score, sent in scored[:num_points]]
        
        return key_points
    
    def generate_title(self, text: str, max_words: int = 10) -> str:
        """
        Generate title from text.
        
        Args:
            text: Input text
            max_words: Maximum words in title
            
        Returns:
            Generated title
        """
        # Use first sentence or extract keywords
        sentences = self._split_sentences(text)
        
        if sentences:
            first_sentence = sentences[0]
            words = first_sentence.split()
            
            if len(words) <= max_words:
                return first_sentence
            else:
                return ' '.join(words[:max_words]) + "..."
        
        return "Untitled"
    
    def get_statistics(self, text: str) -> Dict:
        """
        Get text statistics.
        
        Args:
            text: Input text
            
        Returns:
            Statistics dictionary
        """
        sentences = self._split_sentences(text)
        words = re.findall(r'\b\w+\b', text)
        
        return {
            'char_count': len(text),
            'word_count': len(words),
            'sentence_count': len(sentences),
            'avg_words_per_sentence': len(words) / len(sentences) if sentences else 0,
            'unique_words': len(set(words))
        }
