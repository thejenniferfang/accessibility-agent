import { NextRequest, NextResponse } from 'next/server';
import { createScout, listScouts, getScoutStatus, getScoutResults } from '@/agents/yutori-scout/scoutManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.YUTORI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "YUTORI_API_KEY is not set" }, { status: 500 });
    }

    const { action, query, scoutId } = body;

    switch (action) {
      case 'create':
        if (!query) return NextResponse.json({ error: "Query is required for creation" }, { status: 400 });
        const newScout = await createScout(query, '0 9 * * *', apiKey);
        return NextResponse.json(newScout);

      case 'list':
        const scouts = await listScouts(apiKey);
        return NextResponse.json(scouts);

      case 'status':
        if (!scoutId) return NextResponse.json({ error: "Scout ID is required" }, { status: 400 });
        const status = await getScoutStatus(scoutId, apiKey);
        return NextResponse.json(status);

      case 'results':
        if (!scoutId) return NextResponse.json({ error: "Scout ID is required" }, { status: 400 });
        const results = await getScoutResults(scoutId, apiKey);
        return NextResponse.json(results);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Yutori Scout API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
