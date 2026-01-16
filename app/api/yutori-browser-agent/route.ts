import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { urls, goal } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: "Invalid URLs provided" }, { status: 400 });
    }
    
    if (!goal) {
        return NextResponse.json({ error: "Goal is required" }, { status: 400 });
    }

    if (!process.env.YUTORI_API_KEY) {
      return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
    }

    const createdTasks = [];
    const errors = [];

    for (const url of urls) {
        try {
            const response = await fetch('https://api.yutori.com/v1/browsing/tasks', {
                method: 'POST',
                headers: {
                    'X-API-KEY': process.env.YUTORI_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    start_url: url,
                    task: goal
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                errors.push({ url, status: response.status, error: errorText });
                continue;
            }

            const data = await response.json();
            createdTasks.push({ url, ...data });

        } catch (err: any) {
            errors.push({ url, error: err.message });
        }
    }

    return NextResponse.json({ tasks: createdTasks, errors });

  } catch (error: any) {
    console.error("Yutori Browser Agent API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
