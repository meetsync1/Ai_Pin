import { Button } from "@/components/Button";
import { TechNoir } from "@/constants/DesignSystem";
import { DEFAULT_FORMAT, SUMMARIZATION_FORMATS, type SummarizationFormat } from '@/constants/summarization-formats';
import SummarizationService from '@/services/summarization/SummarizationService';
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function SummarizeScreen() {
  const params = useLocalSearchParams<{ text?: string }>();
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SummarizationFormat>(DEFAULT_FORMAT);

  // Load text from navigation params if available
  useEffect(() => {
    if (params.text) {
      console.log('📝 Received transcription from navigation:', params.text.length, 'chars');
      setTranscription(params.text);
    }
  }, [params.text]);

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
    console.log(`📋 Selected format: ${selectedFormat.name}`);
    setIsProcessing(true);
    setError(null);
    setSummary('');

    try {
      const result = await SummarizationService.summarizeWithFormat(transcription, selectedFormat.id);

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
    setSelectedFormat(DEFAULT_FORMAT);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ 
          headerStyle: { backgroundColor: TechNoir.colors.background },
          headerTintColor: TechNoir.colors.textPrimary,
          title: "INTELLIGENCE",
          headerTitleStyle: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }
      }} />
      <StatusBar style="light" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <Ionicons name="sparkles" size={24} color={TechNoir.colors.tint} style={{ marginBottom: 8 }} />
            <Text style={styles.title}>SUMMARIZER</Text>
            <Text style={styles.subtitle}>INPUT TRANSCRIPTION DATA FOR ANALYSIS</Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>INPUT SOURCE</Text>
          <View style={styles.inputWrapper}>
            <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={8}
                value={transcription}
                onChangeText={setTranscription}
                placeholder="AWAITING DATA..."
                placeholderTextColor={TechNoir.colors.textSecondary}
                editable={!isProcessing}
            />
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <Text style={styles.charCount}>{transcription.length} UNITS</Text>
        </View>

        {/* Format Selector */}
        <View style={styles.formatSection}>
          <Text style={styles.label}>OUTPUT FORMAT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatScroll}>
            {SUMMARIZATION_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatChip,
                  selectedFormat.id === format.id && styles.formatChipSelected,
                ]}
                onPress={() => setSelectedFormat(format)}
                disabled={isProcessing}
              >
                <Ionicons 
                  name={format.icon as any} 
                  size={14} 
                  color={selectedFormat.id === format.id ? TechNoir.colors.background : TechNoir.colors.textSecondary} 
                />
                <Text style={[
                  styles.formatChipText,
                  selectedFormat.id === format.id && styles.formatChipTextSelected,
                ]}>
                  {format.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.formatDescription}>{selectedFormat.description}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <View style={{flex: 1}}>
             <Button
                title={isProcessing ? "PROCESSING..." : "INITIATE ANALYSIS"}
                onPress={handleSummarize}
                variant="primary"
                icon={isProcessing ? <ActivityIndicator color={TechNoir.colors.background} /> : <Ionicons name="flash" size={16} color={TechNoir.colors.background} />}
             />
          </View>
          {transcription.length > 0 && !isProcessing && (
              <View style={{flex: 0.4}}>
                <Button
                    title="CLEAR"
                    onPress={handleClear}
                    variant="ghost"
                    textStyle={{ color: TechNoir.colors.error }}
                />
              </View>
          )}
        </View>

        {/* Processing Message */}
        {isProcessing && (
          <View style={styles.statusContainer}>
             <ActivityIndicator color={TechNoir.colors.tint} />
             <Text style={styles.statusText}>Accessing Neural Neural Model...</Text>
             <Text style={[styles.statusText, { fontSize: 10, marginTop: 4 }]}>ESTIMATED TIME: 30-90s</Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color={TechNoir.colors.error} />
            <Text style={styles.errorText}>ERROR: {error.toUpperCase()}</Text>
          </View>
        )}

        {/* Summary Display */}
        {summary && summary.length > 0 && (
          <View style={styles.summarySection}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>ANALYSIS RESULT</Text>
              {processingTime && (
                <Text style={styles.processingTime}>
                  ⚡ {(processingTime / 1000).toFixed(2)}s
                </Text>
              )}
            </View>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryDecorLine} />
              <View style={styles.summaryDecorLine} />
              <View style={{ marginLeft: 12 }}>
                {summary.split('\n').map((line, i) => {
                  // Check for bullet points
                  const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
                  const cleanLine = isBullet ? line.trim().substring(2) : line;

                  const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                  
                  return (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
                      {isBullet && <Text style={{ color: TechNoir.colors.tint, marginRight: 8 }}>•</Text>}
                      <Text style={{ flex: 1 }}>
                        {parts.map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <Text key={j} style={[styles.summaryText, { fontWeight: 'bold', color: TechNoir.colors.textPrimary }]}>
                                {part.slice(2, -2)}
                              </Text>
                            );
                          }
                          return (
                            <Text key={j} style={styles.summaryText}>
                              {part}
                            </Text>
                          );
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TechNoir.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
      alignItems: 'center',
      marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: TechNoir.colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: TechNoir.colors.textSecondary,
    letterSpacing: 2,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TechNoir.colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
      position: 'relative',
  },
  textInput: {
    backgroundColor: TechNoir.colors.surface,
    borderRadius: 2,
    padding: 16,
    fontSize: 14,
    color: TechNoir.colors.textPrimary,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
    minHeight: 150,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cornerTL: { position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTopWidth: 2, borderLeftWidth: 2, borderColor: TechNoir.colors.textPrimary },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: TechNoir.colors.textPrimary },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: 8, height: 8, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: TechNoir.colors.textPrimary },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottomWidth: 2, borderRightWidth: 2, borderColor: TechNoir.colors.textPrimary },
  
  charCount: {
    fontSize: 10,
    color: TechNoir.colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
    letterSpacing: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: TechNoir.colors.surface,
    borderWidth: 1,
    borderColor: TechNoir.colors.tint,
    borderRadius: 4,
    marginBottom: 24,
  },
  statusText: {
      marginTop: 8,
      color: TechNoir.colors.tint,
      fontSize: 12,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
  },
  errorContainer: {
    backgroundColor: TechNoir.colors.surface,
    padding: 16,
    borderRadius: 4,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: TechNoir.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: TechNoir.colors.error,
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  summarySection: {
    marginTop: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TechNoir.colors.textPrimary,
    letterSpacing: 1,
  },
  processingTime: {
    fontSize: 12,
    color: TechNoir.colors.textSecondary,
    fontFamily: 'monospace',
  },
  summaryContainer: {
    backgroundColor: TechNoir.colors.surface,
    padding: 20,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
    position: 'relative',
    minHeight: 100,
  },
  summaryDecorLine: {
      position: 'absolute',
      left: 0, 
      top: 20, 
      bottom: 20, 
      width: 2, 
      backgroundColor: TechNoir.colors.tint,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 24,
    color: TechNoir.colors.textPrimary,
    marginLeft: 12,
  },
  // Format Selector Styles
  formatSection: {
    marginBottom: 24,
  },
  formatScroll: {
    marginBottom: 8,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: TechNoir.colors.surface,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
    gap: 6,
  },
  formatChipSelected: {
    backgroundColor: TechNoir.colors.textPrimary,
    borderColor: TechNoir.colors.textPrimary,
  },
  formatChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: TechNoir.colors.textSecondary,
    letterSpacing: 0.5,
  },
  formatChipTextSelected: {
    color: TechNoir.colors.background,
  },
  formatDescription: {
    fontSize: 11,
    color: TechNoir.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
