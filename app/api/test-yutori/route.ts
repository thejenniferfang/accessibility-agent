import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: "https://api.yutori.com/v1",
  apiKey: process.env.YUTORI_API_KEY,
  timeout: 60000, // Increase timeout to 60 seconds
  maxRetries: 3,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.YUTORI_API_KEY) {
      return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
    }
    
    const { automationLog } = await req.json();

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Here is the log from the automation run:\n\n${automationLog}\n\nPlease analyze this output.
            
            Return a JSON object with the following structure:
            {
              "summary": "A human-readable summary of the findings (markdown supported)",
              "tickets": [
                {
                  "title": "Short title for the issue",
                  "description": "Detailed description of the issue",
                  "priority": "high" | "medium" | "low"
                }
              ]
            }
            
            Do not wrap the JSON in markdown code blocks. Just return the raw JSON string.`,
          },
        ],
      },
    ];

    const response = await client.chat.completions.create({
      model: "n1-preview-2025-11",
      messages: messages,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    let parsedData;
    try {
        parsedData = JSON.parse(content);
    } catch (e) {
        // Fallback if the model returns markdown code blocks despite instructions
        const match = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
        if (match) {
            parsedData = JSON.parse(match[1] || match[0]);
        } else {
            throw new Error("Could not parse JSON from response");
        }
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Yutori Test API Error:", error);
    
    // Handle 504 specifically if needed, but OpenAI client handles retries for network errors usually.
    // However, if the server returns 504, it might be an issue on their side.
    const status = error.status || 500;
    const message = error.message || String(error);

    return NextResponse.json(
      { error: "API Error", details: message },
      { status: status }
    );
  }
}
