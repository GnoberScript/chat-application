"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  _id: string;
  content: string;
  timestamp: string;
  user: string;
}

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const lastTimestampRef = useRef<string | null>(null);

  const fetchMessages = async () => {
    try {
      const url = `/api/chat${
        lastTimestampRef.current
          ? `?lastTimestamp=${lastTimestampRef.current}`
          : ""
      }`;
      const response = await fetch(url);
      const newMessages = await response.json();

      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
        lastTimestampRef.current =
          newMessages[newMessages.length - 1].timestamp;
      }

      // Immediately start polling again
      fetchMessages();
    } catch (error) {
      console.error("Error fetching messages:", error);
      // Retry after a short delay if there's an error
      setTimeout(fetchMessages, 1000);
    }
  };

  useEffect(() => {
    let eventSource: EventSource;

    const connectToSSE = () => {
      // Close any existing connection
      if (eventSource) {
        eventSource.close();
      }

      // Create new EventSource connection
      eventSource = new EventSource("/api/chat");

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMessage]);
      };

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error("EventSource failed:", error);
        eventSource.close();

        // Attempt to reconnect after 5 seconds
        setTimeout(connectToSSE, 5000);
      };
    };

    // Initial connection
    connectToSSE();

    // Cleanup function to close the connection when component unmounts
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage,
          user: username || "Anonymous",
        }),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 shadow-lg rounded-lg transform transition-all hover:-translate-y-1">
      <div className="flex flex-col gap-4">
        <div className="w-44">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="border rounded-lg p-4 mb-4 h-[500px] overflow-y-auto bg-gray-50">
          {messages.map((message) => (
            <div
              key={message._id}
              className="mb-2 p-2 hover:bg-gray-100 rounded"
            >
              <span className="font-bold text-blue-600">{message.user}: </span>
              <span>{message.content}</span>
              <span className="text-xs text-gray-500 ml-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
