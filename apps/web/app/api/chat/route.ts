import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You are MedAssist AI, an intelligent medical records assistant embedded in a blockchain-based medical record management portal called "Central Hack". You help healthcare providers, doctors, and administrators analyze patient medical records, generate insightful reports, and answer questions about their documents.

You have access to the user's medical records metadata that will be provided in the conversation context. Use this information to:

1. **Generate Reports**: When asked, create comprehensive, well-structured reports analyzing the patient's medical records. Reports should include:
   - Executive summary
   - Timeline of records
   - Key observations and patterns
   - Record categorization breakdown
   - Recommendations or areas needing attention

2. **Answer Questions**: Provide accurate, helpful answers about the records, access permissions, and document management.

3. **Provide Insights**: Identify patterns, gaps in documentation, upcoming needs, and potential compliance issues.

4. **Explain Medical Terms**: When relevant, explain medical terminology in accessible language.

Guidelines:
- Always be professional and precise.
- Use markdown formatting for reports (headers, bullet points, tables, bold text).
- When generating reports, be thorough but concise.
- If you don't have enough information, say so clearly.
- Never fabricate medical data — only reference what's provided in the context.
- Remember this is a blockchain-based system — records are immutable once uploaded.
- Respect that this system deals with sensitive medical data (HIPAA-aware language).
- When referencing records, mention their names, types, timestamps, and departments when available.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  documentContext?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ChatRequestBody;
    const { messages, documentContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty." },
        { status: 400 }
      );
    }

    // Build the system message with document context
    let systemContent = SYSTEM_PROMPT;
    if (documentContext) {
      systemContent += `\n\n---\n\n## Current Document Context\n\nThe following is the metadata of the user's medical records currently loaded in the portal:\n\n${documentContext}`;
    } else {
      systemContent += `\n\n---\n\nNo medical records are currently loaded. The user may need to enter a patient address and load records first.`;
    }

    const openaiMessages: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Stream the response from OpenAI
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: openaiMessages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        {
          error: `AI service error: ${openaiResponse.status} ${openaiResponse.statusText}`,
        },
        { status: openaiResponse.status }
      );
    }

    // Create a ReadableStream to pipe the SSE response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content })}\n\n`
                    )
                  );
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        } catch (err) {
          console.error("Stream processing error:", err);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
