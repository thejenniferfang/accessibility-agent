import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60s timeout
  maxRetries: 3,
});

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
    }

    const { screenshotUrl, screenshotUrls, automationLog, url } = await req.json();
    console.log("Input Body:", JSON.stringify({ screenshotUrl, screenshotUrls, automationLog, url }, null, 2));

    const urls = screenshotUrls || (screenshotUrl ? [screenshotUrl] : []);
    
    const urlContext = url ? `\n\nThis analysis is for the URL: ${url}` : '';
    
    const content: any[] = [
      {
        type: "text",
        text: `Here is the log from the automation run:\n\n${automationLog}${urlContext}\n\nPlease analyze this output.

        Do not include any introductory text. Just the findings.
        
        Identify ALL accessibility findings and issues. For EACH distinct finding, you MUST create a separate ticket. If there are multiple findings, create one ticket per finding. If you find fewer than 3 distinct issues, identify additional accessibility concerns or improvements to reach a minimum of 3 tickets.
        
        Return a JSON object with the following structure:
        {
          "summary": "A human-readable, concise summary of all findings (markdown supported).",
          "tickets": [
            {
              "title": "Short title for the issue",
              "description": "Detailed description of the issue",
              "priority": "high" | "medium" | "low"
            }
          ]
        }
        
        CRITICAL: The "tickets" array must contain one ticket for EACH distinct finding. Each finding gets its own ticket object in the array. Create a minimum of 3 tickets total.
        
        Do not wrap the JSON in markdown code blocks. Just return the raw JSON string.`,
      },
    ];

    if (urls.length > 0) {
      urls.forEach((url: string) => {
        content.push({
          type: "image_url",
          image_url: {
            url: url,
          },
        });
      });
    }

    const messages: any[] = [
      {
        role: "user",
        content: content,
      },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-5.2",
      messages: messages,
      response_format: { type: "json_object" }
    });

    console.log("OpenAI API Response Body:", JSON.stringify(response, null, 2));

    const responseContent = response.choices[0].message.content || "{}";
    console.log("OpenAI API Raw Content:", responseContent);
    
    let parsedData;
    try {
        parsedData = JSON.parse(responseContent);
        console.log("OpenAI API Parsed Data:", JSON.stringify(parsedData, null, 2));
    } catch (e) {
        // Fallback for markdown wrapped JSON
        const match = responseContent.match(/```json\n([\s\S]*?)\n```/) || responseContent.match(/{[\s\S]*}/);
        if (match) {
            parsedData = JSON.parse(match[1] || match[0]);
        } else {
             // Return raw content if parsing fails, but wrapped in structure
            return NextResponse.json({ summary: responseContent, tickets: [] });
        }
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
