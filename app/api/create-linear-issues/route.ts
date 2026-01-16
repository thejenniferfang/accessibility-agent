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

    // 1. Get the first Team ID and its Active workflow state
    const teamQuery = `
      query {
        teams(first: 1) {
          nodes {
            id
            name
            states {
              nodes {
                id
                name
                type
              }
            }
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
    const teamNode = teamData?.data?.teams?.nodes?.[0];
    const teamId = teamNode?.id;

    if (!teamId) {
      return NextResponse.json({ error: "Could not find a Linear team to add issues to." }, { status: 500 });
    }

    // Find the first state with type "started" (Active)
    const activeState = teamNode.states.nodes.find((s: any) => s.type === "started" || s.name.toLowerCase() === "active" || s.name.toLowerCase() === "in progress");
    const stateId = activeState?.id;

    // 2. Create issues
    const results = [];
    for (const ticket of tickets) {
      // Linear priority mapping: 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
      const priorityMap: Record<string, number> = {
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
        none: 0,
      };

      const ticketPriority = ticket.priority?.toLowerCase() || 'none';
      const priority = priorityMap[ticketPriority] ?? 0;
      
      console.log(`Setting priority for ticket "${ticket.title}": ${ticketPriority} -> ${priority}`);

      const mutation = `
        mutation IssueCreate($title: String!, $description: String!, $teamId: String!, $priority: Int, $stateId: String) {
          issueCreate(input: {
            title: $title
            description: $description
            teamId: $teamId
            priority: $priority
            stateId: $stateId
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
            stateId,
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
