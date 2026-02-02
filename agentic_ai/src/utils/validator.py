"""
Validator
Validates agent behaviors and outputs.
"""

from typing import Any, Dict, List


class Validator:
    """
    Validates agent behaviors, outputs, and integrity.
    """
    
    def __init__(self):
        self.validation_results = []
    
    def validate_action(self, action: Any, valid_actions: List[Any]) -> bool:
        """
        Validate if action is allowed.
        
        Args:
            action: Action to validate
            valid_actions: List of valid actions
            
        Returns:
            True if valid, False otherwise
        """
        is_valid = action in valid_actions
        
        self.validation_results.append({
            'type': 'action',
            'value': action,
            'valid': is_valid
        })
        
        return is_valid
    
    def validate_state(self, state: Any, constraints: Dict) -> bool:
        """
        Validate state against constraints.
        
        Args:
            state: State to validate
            constraints: State constraints
            
        Returns:
            True if valid, False otherwise
        """
        is_valid = True
        
        # Check constraints
        if 'min' in constraints and state < constraints['min']:
            is_valid = False
        
        if 'max' in constraints and state > constraints['max']:
            is_valid = False
        
        self.validation_results.append({
            'type': 'state',
            'value': state,
            'valid': is_valid
        })
        
        return is_valid
    
    def validate_output(self, output: Any, expected_type: type) -> bool:
        """
        Validate output type.
        
        Args:
            output: Output to validate
            expected_type: Expected type
            
        Returns:
            True if valid, False otherwise
        """
        is_valid = isinstance(output, expected_type)
        
        self.validation_results.append({
            'type': 'output',
            'value': type(output).__name__,
            'expected': expected_type.__name__,
            'valid': is_valid
        })
        
        return is_valid
    
    def validate_summary(self, summary: str, min_length: int = 10, max_length: int = 1000) -> Dict:
        """
        Validate generated summary.
        
        Args:
            summary: Summary text to validate
            min_length: Minimum acceptable length
            max_length: Maximum acceptable length
            
        Returns:
            Validation result with details
        """
        result = {
            'valid': True,
            'issues': []
        }
        
        # Check length
        if len(summary) < min_length:
            result['valid'] = False
            result['issues'].append(f"Summary too short ({len(summary)} < {min_length})")
        
        if len(summary) > max_length:
            result['valid'] = False
            result['issues'].append(f"Summary too long ({len(summary)} > {max_length})")
        
        # Check for empty summary
        if not summary.strip():
            result['valid'] = False
            result['issues'].append("Summary is empty")
        
        self.validation_results.append({
            'type': 'summary',
            'length': len(summary),
            'valid': result['valid']
        })
        
        return result
    
    def get_validation_report(self) -> Dict:
        """Get validation report."""
        total = len(self.validation_results)
        passed = sum(1 for r in self.validation_results if r['valid'])
        
        return {
            'total': total,
            'passed': passed,
            'failed': total - passed,
            'success_rate': passed / total if total > 0 else 0,
            'results': self.validation_results
        }
    
    def reset(self):
        """Reset validation results."""
        self.validation_results.clear()
