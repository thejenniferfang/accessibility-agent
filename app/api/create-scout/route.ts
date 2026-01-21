import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {

    if (!process.env.YUTORI_API_KEY) {
      return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
    }

    const query = `Find URLs that potentially are inaccessible. Return a list of inaccessible URLs and the reason why they might be inaccessible.`;

    const response = await fetch('https://api.yutori.com/v1/scouting/tasks', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.YUTORI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        task_spec: {
            output_schema: {
                type: "json",
                json_schema: {
                    type: "object",
                    properties: {
                        inaccessible_urls: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    url: { type: "string" },
                                    reason: { type: "string" }
                                },
                                required: ["url", "reason"]
                            }
                        }
                    },
                    required: ["inaccessible_urls"]
                }
            }
        }
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: "Yutori API Error", details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Create Scout API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
