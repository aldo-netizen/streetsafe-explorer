import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { queryAll } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Invalid message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let iterations = 0;
        const maxIterations = 10;

        while (iterations < maxIterations) {
          iterations++;

          const response = await client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools,
            messages,
          });

          let currentToolName = '';
          let currentToolInput = '';
          let currentToolId = '';
          const assistantContent: Anthropic.ContentBlockParam[] = [];
          let hasToolUse = false;

          for await (const event of response) {
            if (event.type === 'content_block_start') {
              if (event.content_block.type === 'text') {
                // Start of text block
              } else if (event.content_block.type === 'tool_use') {
                hasToolUse = true;
                currentToolName = event.content_block.name;
                currentToolId = event.content_block.id;
                currentToolInput = '';
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                // Stream text chunks to client immediately
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`)
                );
              } else if (event.delta.type === 'input_json_delta') {
                currentToolInput += event.delta.partial_json;
              }
            } else if (event.type === 'content_block_stop') {
              if (currentToolName) {
                assistantContent.push({
                  type: 'tool_use',
                  id: currentToolId,
                  name: currentToolName,
                  input: JSON.parse(currentToolInput || '{}'),
                } as Anthropic.ContentBlockParam);
                currentToolName = '';
              }
            } else if (event.type === 'message_start' || event.type === 'message_delta') {
              // Capture text blocks in assistant content for message history
            }
          }

          // Build full assistant content including text blocks
          const finalMessage = await response.finalMessage();
          const fullAssistantContent = finalMessage.content.map((block) => {
            if (block.type === 'text') {
              return { type: 'text' as const, text: block.text };
            }
            return block;
          }) as Anthropic.ContentBlockParam[];

          if (!hasToolUse || finalMessage.stop_reason === 'end_turn') {
            // Done — send end event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // Process tool calls
          messages.push({ role: 'assistant', content: fullAssistantContent });
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of finalMessage.content) {
            if (block.type === 'tool_use') {
              if (block.name === 'run_sql') {
                const query = (block.input as { query: string }).query;
                // Send SQL query event
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'sql', content: query })}\n\n`)
                );
                const result = await executeQuery(query);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              } else if (block.name === 'render_chart') {
                // Send chart event
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'chart', content: block.input })}\n\n`)
                );
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: 'Chart rendered successfully.',
                });
              }
            }
          }

          messages.push({ role: 'user', content: toolResults });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', content: 'Reached maximum analysis iterations.' })}\n\n`)
        );
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (e) {
        console.error('Search stream error:', e);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', content: (e as Error).message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
