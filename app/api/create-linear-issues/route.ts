import { NextRequest, NextResponse } from 'next/server';

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!LINEAR_API_KEY) {
      return NextResponse.json({ error: "LINEAR_API_KEY is not set" }, { status: 500 });
    }

    const { tickets } = await req.json();

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets provided" }, { status: 400 });
    }

    // 1. Get the first Team ID
    const teamQuery = `
      query {
        teams(first: 1) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const teamResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: teamQuery }),
    });

    const teamData = await teamResponse.json();
    const teamId = teamData?.data?.teams?.nodes?.[0]?.id;

    if (!teamId) {
      return NextResponse.json({ error: "Could not find a Linear team to add issues to." }, { status: 500 });
    }

    // 2. Create issues
    const results = [];
    for (const ticket of tickets) {
      const priorityMap: Record<string, number> = {
        high: 1, // Urgent
        medium: 2, // High
        low: 3, // Normal
        none: 0, // No priority
      };

      const priority = priorityMap[ticket.priority?.toLowerCase()] ?? 0;

      const mutation = `
        mutation IssueCreate($title: String!, $description: String!, $teamId: String!, $priority: Int) {
          issueCreate(input: {
            title: $title
            description: $description
            teamId: $teamId
            priority: $priority
          }) {
            success
            issue {
              id
              identifier
              url
            }
          }
        }
      `;

      const createResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": LINEAR_API_KEY,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            title: ticket.title,
            description: ticket.description,
            teamId,
            priority,
          },
        }),
      });

      const createData = await createResponse.json();
      if (createData.errors) {
        console.error("Linear Create Error:", createData.errors);
        results.push({ title: ticket.title, success: false, error: createData.errors[0].message });
      } else {
        results.push({ 
          title: ticket.title, 
          success: true, 
          issue: createData.data.issueCreate.issue 
        });
      }
    }

    return NextResponse.json({ 
        success: true, 
        results,
        teamName: teamData.data.teams.nodes[0].name 
    });

  } catch (error) {
    console.error("Linear API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
