"""
Test Suite for Utils
"""

import unittest
import tempfile
import os
from src.utils.summarizer import Summarizer
from src.utils.metrics import Metrics
from src.utils.validator import Validator


class TestSummarizer(unittest.TestCase):
    """Test summarization functionality."""
    
    def setUp(self):
        """Create summarizer."""
        self.summarizer = Summarizer(method="extractive", max_length=500)
    
    def test_text_summarization(self):
        """Test basic text summarization."""
        text = "This is a test. " * 20
        summary = self.summarizer.summarize_text(text, num_sentences=2)
        
        self.assertIsNotNone(summary)
        self.assertLess(len(summary), len(text))
    
    def test_extract_key_points(self):
        """Test key point extraction."""
        text = "Point one is important. Point two is also important. Point three is critical."
        key_points = self.summarizer.extract_key_points(text, num_points=2)
        
        self.assertEqual(len(key_points), 2)
    
    def test_generate_title(self):
        """Test title generation."""
        text = "The quick brown fox jumps over the lazy dog. This is a test sentence."
        title = self.summarizer.generate_title(text, max_words=5)
        
        self.assertIsNotNone(title)
        self.assertLessEqual(len(title.split()), 6)  # 5 + possible ...


class TestMetrics(unittest.TestCase):
    """Test metrics tracking."""
    
    def setUp(self):
        """Create metrics tracker."""
        self.metrics = Metrics()
    
    def test_record_metric(self):
        """Test recording metrics."""
        self.metrics.record("accuracy", 0.95)
        self.metrics.record("accuracy", 0.97)
        
        avg = self.metrics.get_average("accuracy")
        self.assertAlmostEqual(avg, 0.96)
    
    def test_counters(self):
        """Test counter increment."""
        self.metrics.increment("actions")
        self.metrics.increment("actions", 2)
        
        count = self.metrics.get_counter("actions")
        self.assertEqual(count, 3)
    
    def test_timers(self):
        """Test timer functionality."""
        import time
        
        self.metrics.start_timer("test_timer")
        time.sleep(0.01)
        duration = self.metrics.stop_timer("test_timer")
        
        self.assertGreater(duration, 0)


class TestValidator(unittest.TestCase):
    """Test validation functionality."""
    
    def setUp(self):
        """Create validator."""
        self.validator = Validator()
    
    def test_action_validation(self):
        """Test action validation."""
        valid_actions = ["move", "turn", "stop"]
        
        self.assertTrue(self.validator.validate_action("move", valid_actions))
        self.assertFalse(self.validator.validate_action("jump", valid_actions))
    
    def test_summary_validation(self):
        """Test summary validation."""
        good_summary = "This is a good summary with appropriate length."
        result = self.validator.validate_summary(good_summary, min_length=10, max_length=100)
        
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['issues']), 0)
        
        short_summary = "Too short"
        result = self.validator.validate_summary(short_summary, min_length=20)
        
        self.assertFalse(result['valid'])
        self.assertGreater(len(result['issues']), 0)


if __name__ == '__main__':
    unittest.main()
