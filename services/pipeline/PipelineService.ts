/**
 * Pipeline Service - Connects ASR → Storage → LLM → Summary
 * 
 * This service orchestrates the complete flow from voice recording
 * to generating a formatted summary using on-device AI.
 */

import { DEFAULT_MODEL } from '@/constants/models';
import ModelManager from '@/services/llm/ModelManager';
import TranscriptionStorage from '@/services/storage/TranscriptionStorage';
import SummarizationService, { SummaryResult } from '@/services/summarization/SummarizationService';
import WhisperService, { TranscriptionResult } from '@/services/whisper/WhisperService';
import { documentDirectory, getInfoAsync, makeDirectoryAsync, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';

export interface PipelineResult {
    transcription: TranscriptionResult | null;
    transcriptionPath: string | null;
    summary: SummaryResult | null;
    summaryPath: string | null;
    stages: {
        asr: 'pending' | 'running' | 'completed' | 'failed';
        storage: 'pending' | 'running' | 'completed' | 'failed';
        llm: 'pending' | 'running' | 'completed' | 'failed';
    };
    errors: string[];
    totalDuration: number;
}

export interface PipelineCallbacks {
    onStageChange?: (stage: string, status: string) => void;
    onTranscriptionProgress?: (progress: number) => void;
    onTranscriptionText?: (text: string) => void;
    onSummaryGenerated?: (summary: string) => void;
    onError?: (error: string) => void;
}

class PipelineService {
    private isRunning = false;
    private result: PipelineResult = this.createEmptyResult();

    private createEmptyResult(): PipelineResult {
        return {
            transcription: null,
            transcriptionPath: null,
            summary: null,
            summaryPath: null,
            stages: {
                asr: 'pending',
                storage: 'pending',
                llm: 'pending',
            },
            errors: [],
            totalDuration: 0,
        };
    }

    /**
     * Initialize the pipeline - ensures both Whisper and LLM models are ready
     */
    async initialize(callbacks?: PipelineCallbacks): Promise<boolean> {
        try {
            console.log('🚀 Initializing Pipeline...');

            // Initialize Whisper for ASR
            callbacks?.onStageChange?.('whisper', 'initializing');
            if (!WhisperService.isReady()) {
                await WhisperService.initialize();
            }
            console.log('✅ Whisper ready');

            // Initialize LLM for summarization
            callbacks?.onStageChange?.('llm', 'initializing');
            if (!ModelManager.isReady()) {
                // Get model path
                const modelDir = `${documentDirectory}models/`;
                const modelPath = `${modelDir}${DEFAULT_MODEL.id}`;

                // Check if model exists
                const modelInfo = await getInfoAsync(modelPath);
                if (!modelInfo.exists) {
                    console.log('⚠️ LLM model not downloaded yet');
                    callbacks?.onError?.('LLM model not downloaded. Please download from Settings.');
                    return false;
                }

                await ModelManager.loadModel({
                    ...DEFAULT_MODEL,
                    path: modelPath,
                });
            }
            console.log('✅ LLM ready');

            console.log('✅ Pipeline initialized');
            return true;
        } catch (error) {
            console.error('❌ Pipeline initialization failed:', error);
            callbacks?.onError?.(error instanceof Error ? error.message : 'Initialization failed');
            return false;
        }
    }

    /**
     * Check if pipeline is ready to run
     */
    isReady(): boolean {
        return WhisperService.isReady() && ModelManager.isReady();
    }

    /**
     * Run the complete pipeline: Transcribe → Store → Summarize
     * This method processes an existing transcription
     */
    async processTranscription(
        transcription: TranscriptionResult,
        callbacks?: PipelineCallbacks
    ): Promise<PipelineResult> {
        const startTime = Date.now();
        this.result = this.createEmptyResult();
        this.result.transcription = transcription;
        this.result.stages.asr = 'completed';

        try {
            // Stage 1: Already have transcription, skip ASR
            console.log('📝 Processing existing transcription...');

            // Stage 2: Store transcription
            this.result.stages.storage = 'running';
            callbacks?.onStageChange?.('storage', 'running');

            try {
                const paths = await TranscriptionStorage.saveBoth(transcription);
                this.result.transcriptionPath = paths.json;
                this.result.stages.storage = 'completed';
                callbacks?.onStageChange?.('storage', 'completed');
                console.log('✅ Transcription stored:', paths.json);
            } catch (error) {
                console.error('❌ Storage failed:', error);
                this.result.stages.storage = 'failed';
                this.result.errors.push(`Storage: ${error instanceof Error ? error.message : 'Unknown'}`);
            }

            // Stage 3: Generate summary with LLM
            await this.runSummaryStage(transcription.text, callbacks);

            this.result.totalDuration = Date.now() - startTime;
            return this.result;
        } catch (error) {
            console.error('❌ Pipeline failed:', error);
            this.result.errors.push(error instanceof Error ? error.message : 'Pipeline failed');
            return this.result;
        }
    }

    /**
     * Run just the summarization stage on existing text
     */
    async summarizeText(
        text: string,
        callbacks?: PipelineCallbacks
    ): Promise<SummaryResult> {
        const startTime = Date.now();

        try {
            // Ensure LLM is ready
            if (!ModelManager.isReady()) {
                callbacks?.onStageChange?.('llm', 'initializing');

                const modelDir = `${documentDirectory}models/`;
                const modelPath = `${modelDir}${DEFAULT_MODEL.id}`;

                await ModelManager.loadModel({
                    ...DEFAULT_MODEL,
                    path: modelPath,
                });
            }

            callbacks?.onStageChange?.('llm', 'running');

            console.log('🤖 Generating summary...');
            const result = await SummarizationService.summarize(text);

            if (result.error) {
                callbacks?.onError?.(result.error);
            } else {
                callbacks?.onSummaryGenerated?.(result.summary);
            }

            callbacks?.onStageChange?.('llm', result.error ? 'failed' : 'completed');

            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Summarization failed';
            callbacks?.onError?.(errorMsg);
            callbacks?.onStageChange?.('llm', 'failed');

            return {
                summary: '',
                processingTime: Date.now() - startTime,
                tokensGenerated: 0,
                error: errorMsg,
            };
        }
    }

    /**
     * Load a transcription from storage and summarize it
     */
    async loadAndSummarize(
        transcriptionId: string,
        callbacks?: PipelineCallbacks
    ): Promise<PipelineResult> {
        const startTime = Date.now();
        this.result = this.createEmptyResult();

        try {
            // Load transcription from storage
            callbacks?.onStageChange?.('storage', 'running');

            const transcription = await TranscriptionStorage.loadById(transcriptionId);
            if (!transcription) {
                throw new Error(`Transcription not found: ${transcriptionId}`);
            }

            this.result.transcription = transcription;
            this.result.stages.asr = 'completed';
            this.result.stages.storage = 'completed';
            callbacks?.onStageChange?.('storage', 'completed');

            console.log('✅ Loaded transcription:', transcription.text.substring(0, 100));

            // Generate summary
            await this.runSummaryStage(transcription.text, callbacks);

            this.result.totalDuration = Date.now() - startTime;
            return this.result;
        } catch (error) {
            console.error('❌ Load and summarize failed:', error);
            this.result.errors.push(error instanceof Error ? error.message : 'Failed');
            return this.result;
        }
    }

    /**
     * Private helper to run the summary stage
     */
    private async runSummaryStage(
        text: string,
        callbacks?: PipelineCallbacks
    ): Promise<void> {
        this.result.stages.llm = 'running';
        callbacks?.onStageChange?.('llm', 'running');

        try {
            // Ensure LLM is loaded
            if (!ModelManager.isReady()) {
                console.log('📦 Loading LLM model...');
                const modelDir = `${documentDirectory}models/`;
                const modelPath = `${modelDir}${DEFAULT_MODEL.id}`;

                await ModelManager.loadModel({
                    ...DEFAULT_MODEL,
                    path: modelPath,
                });
            }

            console.log('🤖 Generating summary with LLM...');
            const summaryResult = await SummarizationService.summarize(text);

            if (summaryResult.error) {
                throw new Error(summaryResult.error);
            }

            this.result.summary = summaryResult;
            this.result.stages.llm = 'completed';
            callbacks?.onStageChange?.('llm', 'completed');
            callbacks?.onSummaryGenerated?.(summaryResult.summary);

            console.log('✅ Summary generated:', summaryResult.summary.substring(0, 100));

            // Save summary to file
            await this.saveSummary(summaryResult.summary);
        } catch (error) {
            console.error('❌ Summary generation failed:', error);
            this.result.stages.llm = 'failed';
            this.result.errors.push(`LLM: ${error instanceof Error ? error.message : 'Unknown'}`);
            callbacks?.onError?.(error instanceof Error ? error.message : 'Summary failed');
        }
    }

    /**
     * Save summary to file
     */
    private async saveSummary(summary: string): Promise<void> {
        try {
            const summaryDir = `${documentDirectory}summaries/`;
            await makeDirectoryAsync(summaryDir, { intermediates: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `summary_${timestamp}.md`;
            const filepath = `${summaryDir}${filename}`;

            await writeAsStringAsync(filepath, summary, {
                encoding: EncodingType.UTF8,
            });

            this.result.summaryPath = filepath;
            console.log('✅ Summary saved:', filepath);
        } catch (error) {
            console.error('⚠️ Failed to save summary:', error);
        }
    }

    /**
     * Get current pipeline status
     */
    getStatus(): PipelineResult {
        return this.result;
    }

    /**
     * Check if pipeline is currently running
     */
    isProcessing(): boolean {
        return this.isRunning;
    }
}

export default new PipelineService();
