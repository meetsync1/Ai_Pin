"""
Logger Setup
Configures logging for the agentic AI system.
"""

import logging
import logging.config
import os
from pathlib import Path
import yaml


def setup_logger(config_path: str = None, log_level: str = "INFO") -> logging.Logger:
    """
    Setup logging configuration.
    
    Args:
        config_path: Path to logging config file
        log_level: Default log level
        
    Returns:
        Configured logger
    """
    # Create logs directory
    log_dir = Path("data/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    if config_path and os.path.exists(config_path):
        # Load from YAML config
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
            logging.config.dictConfig(config['logging'])
    else:
        # Default configuration
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / 'agent.log'),
                logging.StreamHandler()
            ]
        )
    
    logger = logging.getLogger("agentic_ai")
    logger.info("Logging configured")
    
    return logger
