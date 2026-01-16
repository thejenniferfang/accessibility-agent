import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url, goal } = await req.json();

    if (!process.env.MINO_API_KEY) {
      return NextResponse.json(
        { error: 'MINO_API_KEY is not set' }, 
        { status: 500 }
      );
    }

    const response = await fetch("https://mino.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.MINO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        goal,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upstream Mino API Error:", {
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        requestBody: { url, goal } // Log what we sent
      });
      return NextResponse.json(
        { error: `Upstream error: ${response.status} ${response.statusText}`, details: errorText }, 
        { status: response.status }
      );
    }

    // Pass the stream through with appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");

    return new NextResponse(response.body, {
      headers,
      status: response.status,
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) }, 
      { status: 500 }
    );
  }
}
