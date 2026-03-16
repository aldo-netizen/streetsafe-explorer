import Anthropic from '@anthropic-ai/sdk';
import { queryAll } from './db';
import fs from 'fs';
import path from 'path';
import type { ChartSpec } from '@/types';

const SCHEMA = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf-8');

const SYSTEM_PROMPT = `You are a data analyst for StreetSafe Explorer, a harm reduction drug checking database with ~20,000 samples from the UNC Opioid Data Lab.

Today's date: ${new Date().toISOString().split('T')[0]}

Database schema:
${SCHEMA}

Column meanings:
- samples.sample_id: unique identifier for each tested sample
- samples.date: ISO format YYYY-MM-DD
- samples.city: city where sample was submitted
- samples.state: state (may be NULL for CSV-imported data)
- samples.assumed_substance: what the person thought it was (can be NULL)
- samples.fentanyl/heroin/xylazine/medetomidine/acetaminophen: 1 if detected, 0 if not
- samples.has_other: 1 if other substances detected beyond the 5 tracked flags
- samples.num_other: count of other substances
- samples.total_substances: total number of distinct substances detected
- detected_substances.substance: normalized lowercase substance name
- detected_substances.abundance: 'Primary' or 'Trace' (may be NULL for CSV data)
- detected_substances.peak: GCMS peak value (may be NULL)

Common substances in the database: fentanyl, heroin, xylazine, medetomidine, acetaminophen, caffeine, cocaine, methamphetamine, 4-anpp, phenethyl 4-anpp, diphenhydramine, dimethyl sulfone

When answering:
- Use the run_sql tool to query the database
- Return clear, concise answers
- When data would be better visualized, use render_chart
- Always cite the number of samples your analysis is based on
- Use percentages and comparisons to make data meaningful
- For time-based queries, use the date column with ISO format comparisons`;

const tools: Anthropic.Tool[] = [
  {
    name: 'run_sql',
    description: 'Execute a read-only SQL query against the StreetSafe samples database. Only SELECT queries are allowed. Returns up to 100 rows.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The SQL SELECT query to execute',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'render_chart',
    description: 'Render a chart for the user. Provide chart type, data, and axis configuration.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['line', 'bar'], description: 'Chart type' },
        title: { type: 'string', description: 'Chart title' },
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of data objects for the chart',
        },
        xKey: { type: 'string', description: 'Key in data objects for x-axis' },
        yKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keys in data objects for y-axis series',
        },
        labels: {
          type: 'object',
          description: 'Optional display labels for yKeys',
        },
      },
      required: ['type', 'title', 'data', 'xKey', 'yKeys'],
    },
  },
];

async function executeQuery(sql: string): Promise<{ result?: unknown[]; error?: string }> {
  const trimmed = sql.trim();
  if (!trimmed.toUpperCase().startsWith('SELECT')) {
    return { error: 'Only SELECT queries are allowed' };
  }
  if (trimmed.includes(';') && trimmed.indexOf(';') < trimmed.length - 1) {
    return { error: 'Multiple statements are not allowed' };
  }

  try {
    const rows = await queryAll(trimmed);
    return { result: rows.slice(0, 100) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function runAgent(userMessage: string): Promise<{
  text: string;
  chartSpecs: ChartSpec[];
  sqlQueries: string[];
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      text: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file to enable natural language search.',
      chartSpecs: [],
      sqlQueries: [],
    };
  }

  const client = new Anthropic({ apiKey });
  const chartSpecs: ChartSpec[] = [];
  const sqlQueries: string[] = [];
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b) => b.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      const textBlocks = response.content
        .filter((b) => b.type === 'text')
        .map(b => (b as Anthropic.TextBlock).text);
      return { text: textBlocks.join('\n'), chartSpecs, sqlQueries };
    }

    messages.push({ role: 'assistant', content: response.content as Anthropic.ContentBlockParam[] });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const toolBlock = block as Anthropic.ToolUseBlock;
      if (toolBlock.name === 'run_sql') {
        const query = (toolBlock.input as { query: string }).query;
        sqlQueries.push(query);
        const result = await executeQuery(query);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      } else if (toolBlock.name === 'render_chart') {
        const spec = toolBlock.input as unknown as ChartSpec;
        chartSpecs.push(spec);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: 'Chart rendered successfully.',
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { text: 'Reached maximum analysis iterations.', chartSpecs, sqlQueries };
}
