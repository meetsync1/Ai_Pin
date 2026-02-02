import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SummarizationService from '@/services/summarization/SummarizationService';

export default function SummarizeScreen() {
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log when summary state changes
  useEffect(() => {
    console.log('📊 Summary state updated, length:', summary?.length || 0);
  }, [summary]);

  const handleSummarize = async () => {
    if (!transcription.trim()) {
      setError('Please enter a transcription');
      return;
    }

    console.log('🎯 Starting summarization...');
    setIsProcessing(true);
    setError(null);
    setSummary('');

    try {
      const result = await SummarizationService.summarize(transcription);
      
      console.log('🎯 Summarization result:', {
        hasError: !!result.error,
        summaryLength: result.summary?.length || 0,
        processingTime: result.processingTime,
      });

      if (result.error) {
        console.log('❌ Summary error:', result.error);
        setError(result.error);
      } else {
        console.log('✅ Setting summary, length:', result.summary?.length);
        setSummary(result.summary);
        setProcessingTime(result.processingTime);
      }
    } catch (err) {
      console.error('❌ Summarize exception:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      console.log('🎯 Summarization complete');
    }
  };

  const handleClear = () => {
    setTranscription('');
    setSummary('');
    setError(null);
    setProcessingTime(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI Transcription Summarizer</Text>
        <Text style={styles.subtitle}>Enter your transcription below</Text>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Transcription</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={8}
            value={transcription}
            onChangeText={setTranscription}
            placeholder="Paste or type your transcription here..."
            placeholderTextColor="#999"
            editable={!isProcessing}
          />
          <Text style={styles.charCount}>{transcription.length} characters</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isProcessing && styles.buttonDisabled]}
            onPress={handleSummarize}
            disabled={isProcessing || !transcription.trim()}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Generate Summary</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleClear}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Summary length: {summary?.length || 0} | Has summary: {summary ? 'YES' : 'NO'}
          </Text>
        </View>

        {/* Summary Display */}
        {summary && summary.length > 0 && (
          <View style={styles.summarySection}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>📝 Summary</Text>
              {processingTime && (
                <Text style={styles.processingTime}>
                  ⚡ {(processingTime / 1000).toFixed(1)}s
                </Text>
              )}
            </View>
            <View style={styles.summaryContainer}>
              <ScrollView 
                style={styles.summaryScroll}
                nestedScrollEnabled={true}
              >
                <Text style={styles.summaryText}>{summary}</Text>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>Generating summary...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  debugContainer: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#1976d2',
    fontFamily: 'monospace',
  },
  summarySection: {
    marginTop: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  processingTime: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 400,
  },
  summaryScroll: {
    flex: 1,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
