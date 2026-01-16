import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "Invalid URLs provided" }, { status: 400 });
    }

    if (!process.env.YUTORI_API_KEY) {
      return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
    }

    const query = `Find the contact person and email address responsible for accessibility or technical changes for the following websites: ${urls.join(', ')}. Return the url, contact name, email, and role for each.`;

    const response = await fetch("https://api.yutori.com/v1/research/tasks", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.YUTORI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query,
        task_spec: {
          output_schema: {
            type: "json",
            json_schema: {
              type: "object",
              properties: {
                contacts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      contact_name: { type: "string" },
                      email: { type: "string" },
                      role: { type: "string" }
                    },
                    required: ["url", "contact_name", "email"]
                  }
                }
              },
              required: ["contacts"]
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
    console.error("Find Owners API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
