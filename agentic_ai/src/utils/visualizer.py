"""
Visualizer
Visualization tools for agent behavior and performance.
"""

from typing import Dict, List
import json


class Visualizer:
    """
    Visualizes agent behavior, metrics, and performance.
    """
    
    def __init__(self):
        self.plots = []
    
    def plot_metrics(self, metrics: Dict):
        """
        Plot metrics over time.
        
        Args:
            metrics: Dictionary of metrics to plot
        """
        # Placeholder - would integrate with matplotlib/plotly
        print("=== Metrics Visualization ===")
        for name, values in metrics.items():
            if isinstance(values, list):
                print(f"{name}: {values[:5]}... (showing first 5)")
            else:
                print(f"{name}: {values}")
    
    def plot_trajectory(self, states: List):
        """
        Plot agent trajectory.
        
        Args:
            states: List of states
        """
        print(f"=== Trajectory ===")
        print(f"Total steps: {len(states)}")
        if states:
            print(f"Start: {states[0]}")
            print(f"End: {states[-1]}")
    
    def plot_rewards(self, rewards: List[float]):
        """
        Plot reward over time.
        
        Args:
            rewards: List of rewards
        """
        print(f"=== Rewards ===")
        print(f"Total episodes: {len(rewards)}")
        if rewards:
            print(f"Average reward: {sum(rewards)/len(rewards):.2f}")
            print(f"Max reward: {max(rewards):.2f}")
            print(f"Min reward: {min(rewards):.2f}")
    
    def visualize_agent(self, agent):
        """
        Visualize agent state and memory.
        
        Args:
            agent: Agent to visualize
        """
        print(f"\n=== Agent: {agent.name} ===")
        print(f"Status: {'Active' if agent.is_active else 'Inactive'}")
        print(f"Memory entries: {len(agent.memory)}")
        print(f"State: {agent.state}")
    
    def export_visualization(self, filepath: str, data: Dict):
        """
        Export visualization data to file.
        
        Args:
            filepath: Output file path
            data: Data to export
        """
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Visualization exported to: {filepath}")
