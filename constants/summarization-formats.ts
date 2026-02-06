/**
 * Summarization Format Templates for RAG-based summarization
 * Each format provides a specialized prompt template for different use cases
 */

export interface SummarizationFormat {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  systemPrompt: string;
  template: (transcription: string) => string;
}

/**
 * Meeting Notes Format
 * Best for: Team meetings, discussions, collaborative sessions
 */
export const MEETING_NOTES: SummarizationFormat = {
  id: 'meeting_notes',
  name: 'Meeting Notes',
  description: 'Structured notes with attendees, topics, and decisions',
  icon: 'people',
  systemPrompt: `You are an expert meeting note-taker. Create clear, organized meeting notes that capture all important information.`,
  template: (transcription: string) => `
Create structured meeting notes from this transcription:

${transcription}

Format as:
## Meeting Summary
Brief 1-2 sentence overview

## Key Discussion Points
- Topic 1: key details
- Topic 2: key details

## Decisions Made
- Decision 1
- Decision 2

## Action Items
- [ ] Task (Owner, if mentioned)

## Next Steps
What happens next
`,
};

/**
 * Action Items Format
 * Best for: Quick extraction of tasks and responsibilities
 */
export const ACTION_ITEMS: SummarizationFormat = {
  id: 'action_items',
  name: 'Action Items',
  description: 'Extract tasks, deadlines, and responsibilities',
  icon: 'checkbox',
  systemPrompt: `You are an expert at extracting actionable items. Focus only on tasks, deadlines, and responsibilities.`,
  template: (transcription: string) => `
Extract all action items from this transcription:

${transcription}

Format as a checklist:
## Action Items

### High Priority
- [ ] Task description (Owner) - Deadline if mentioned

### Normal Priority  
- [ ] Task description (Owner)

### Follow-ups
- [ ] Items to revisit or check on

If no action items found, state: "No explicit action items identified."
`,
};

/**
 * Executive Brief Format
 * Best for: Leadership summaries, quick overviews
 */
export const EXECUTIVE_BRIEF: SummarizationFormat = {
  id: 'executive_brief',
  name: 'Executive Brief',
  description: 'High-level summary for quick review',
  icon: 'briefcase',
  systemPrompt: `You are an executive assistant creating concise briefings. Be direct, highlight only what matters most.`,
  template: (transcription: string) => `
Create an executive brief from this transcription:

${transcription}

Format as:
## Executive Summary
3-4 sentence overview of the most important points.

## Key Takeaways
1. First critical point
2. Second critical point
3. Third critical point

## Recommendations
- Suggested actions or considerations

## Risk/Concerns
- Any issues or risks mentioned (if applicable)
`,
};

/**
 * Detailed Analysis Format (Default)
 * Best for: Comprehensive understanding, documentation
 */
export const DETAILED_ANALYSIS: SummarizationFormat = {
  id: 'detailed_analysis',
  name: 'Detailed Analysis',
  description: 'Comprehensive breakdown with all details',
  icon: 'document-text',
  systemPrompt: `You are an expert at creating clear, detailed summaries. Your summaries should be well-structured with clear sections, include key points and main ideas, use bullet points and formatting for clarity.`,
  template: (transcription: string) => `
Provide a detailed, well-formatted summary of the following transcription:

${transcription}

Format your summary with:
1. **Main Topic** - What is this about?
2. **Key Points** - Main ideas (use bullet points)
3. **Important Details** - Specific facts or information mentioned
4. **Action Items** (if any) - Tasks or next steps mentioned
5. **Conclusion** - Brief wrap-up

Make it clear, organized, and easy to read.
`,
};

/**
 * Key Points Format
 * Best for: Quick scanning, bullet-point summary
 */
export const KEY_POINTS: SummarizationFormat = {
  id: 'key_points',
  name: 'Key Points',
  description: 'Bullet-point list of main ideas',
  icon: 'list',
  systemPrompt: `You are an expert at extracting key information. Provide only bullet points, no prose.`,
  template: (transcription: string) => `
Extract the key points from this transcription as a bullet list:

${transcription}

Format as:
## Key Points

- First main point
- Second main point
- Third main point
...

Keep each point concise (1-2 lines max).
`,
};

/**
 * Q&A Format
 * Best for: Interviews, FAQ extraction, Q&A sessions
 */
export const QA_FORMAT: SummarizationFormat = {
  id: 'qa_format',
  name: 'Q&A Format',
  description: 'Extract questions and answers',
  icon: 'help-circle',
  systemPrompt: `You are an expert at identifying questions and answers in conversations. Format the content as a clear Q&A.`,
  template: (transcription: string) => `
Extract questions and answers from this transcription:

${transcription}

Format as:
## Questions & Answers

**Q: [Question asked]**
A: [Answer provided]

**Q: [Next question]**
A: [Answer]

If clarifications or follow-ups exist, include them under the relevant Q&A.
`,
};

// All available formats
export const SUMMARIZATION_FORMATS: SummarizationFormat[] = [
  DETAILED_ANALYSIS, // Default first
  MEETING_NOTES,
  ACTION_ITEMS,
  EXECUTIVE_BRIEF,
  KEY_POINTS,
  QA_FORMAT,
];

// Helper to get format by ID
export const getFormatById = (id: string): SummarizationFormat => {
  return SUMMARIZATION_FORMATS.find(f => f.id === id) || DETAILED_ANALYSIS;
};

// Default format
export const DEFAULT_FORMAT = DETAILED_ANALYSIS;
