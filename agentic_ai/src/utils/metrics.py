"""
Metrics
Performance tracking and monitoring for agents.
"""

from typing import Dict, List
import time
from collections import defaultdict


class Metrics:
    """
    Tracks and computes performance metrics for agents.
    """
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.counters = defaultdict(int)
        self.timers = {}
    
    def record(self, metric_name: str, value: float):
        """Record a metric value."""
        self.metrics[metric_name].append(value)
    
    def increment(self, counter_name: str, amount: int = 1):
        """Increment a counter."""
        self.counters[counter_name] += amount
    
    def start_timer(self, timer_name: str):
        """Start a timer."""
        self.timers[timer_name] = time.time()
    
    def stop_timer(self, timer_name: str) -> float:
        """Stop timer and record duration."""
        if timer_name in self.timers:
            duration = time.time() - self.timers[timer_name]
            self.record(f"{timer_name}_duration", duration)
            del self.timers[timer_name]
            return duration
        return 0.0
    
    def get_average(self, metric_name: str) -> float:
        """Get average value of a metric."""
        values = self.metrics.get(metric_name, [])
        return sum(values) / len(values) if values else 0.0
    
    def get_total(self, metric_name: str) -> float:
        """Get total of a metric."""
        return sum(self.metrics.get(metric_name, []))
    
    def get_counter(self, counter_name: str) -> int:
        """Get counter value."""
        return self.counters.get(counter_name, 0)
    
    def get_summary(self) -> Dict:
        """Get summary of all metrics."""
        summary = {
            'metrics': {},
            'counters': dict(self.counters)
        }
        
        for name, values in self.metrics.items():
            if values:
                summary['metrics'][name] = {
                    'count': len(values),
                    'mean': sum(values) / len(values),
                    'min': min(values),
                    'max': max(values),
                    'total': sum(values)
                }
        
        return summary
    
    def reset(self):
        """Reset all metrics."""
        self.metrics.clear()
        self.counters.clear()
        self.timers.clear()
    
    def __repr__(self) -> str:
        return f"Metrics(recorded={len(self.metrics)}, counters={len(self.counters)})"
