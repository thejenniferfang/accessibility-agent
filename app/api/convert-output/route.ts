import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: "https://api.yutori.com/v1",
  apiKey: process.env.YUTORI_API_KEY,
  timeout: 60000, // 60s timeout
  maxRetries: 3,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.YUTORI_API_KEY) {
      return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
    }

    const { screenshotUrl, screenshotUrls, automationLog } = await req.json();

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Here is the log from the automation run:\n\n${automationLog}\n\nPlease analyze this output and the accompanying screenshot(s).
            
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

    const urls = screenshotUrls || (screenshotUrl ? [screenshotUrl] : []);
    
    if (urls.length > 0) {
      messages.push({
        role: "observation",
        content: urls.map((url: string) => ({
          type: "image_url",
          image_url: {
            url: url,
          },
        })),
      });
    }

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
        // Fallback for markdown wrapped JSON
        const match = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
        if (match) {
            parsedData = JSON.parse(match[1] || match[0]);
        } else {
             // Return raw content if parsing fails, but wrapped in structure
            return NextResponse.json({ summary: content, tickets: [] });
        }
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Yutori API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
