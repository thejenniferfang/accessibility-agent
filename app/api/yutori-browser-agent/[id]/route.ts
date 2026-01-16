import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!process.env.YUTORI_API_KEY) {
    return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.yutori.com/v1/browsing/tasks/${id}`, {
        method: 'GET',
        headers: {
            'X-API-KEY': process.env.YUTORI_API_KEY,
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
            { error: `Upstream error: ${response.status}`, details: errorText }, 
            { status: response.status }
        );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Yutori Browser Agent Status Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
