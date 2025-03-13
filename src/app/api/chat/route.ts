import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const database = client.db("chat-app");
const messages = database.collection("messages");

export async function GET(req: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  try {
    let lastCheck = new Date();

    const response = new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    const pollForChanges = async () => {
      while (true) {
        try {
          const newMessages = await messages
            .find({
              timestamp: { $gt: lastCheck },
            })
            .toArray();

          if (newMessages.length > 0) {
            for (const message of newMessages) {
              const data = `data: ${JSON.stringify(message)}\n\n`;
              await writer.write(encoder.encode(data));
            }
            lastCheck = new Date();
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(
            "Polling error:",
            error instanceof Error ? error.message : "Unknown error"
          );
          break;
        }
      }
    };

    pollForChanges();

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await messages.insertOne({
      content: body.content,
      timestamp: new Date(),
      user: body.user || "Anonymous",
    });
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
