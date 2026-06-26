import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../components/MessageBubble";
import type { MessageResponse } from "../types";

const mockOwnMessage: MessageResponse = {
  id: "msg_1234567890_1",
  thread_module_id: 100,
  message: "Hello World",
  user_id: 1,
  farmer_id: null,
  sender_type: "user",
  sender_name: "User",
  created_at: new Date().toISOString(),
};

const mockOtherMessage: MessageResponse = {
  id: "msg_1234567890_2",
  thread_module_id: 100,
  message: "Hi there!",
  user_id: null,
  farmer_id: null,
  sender_type: "ai_agent",
  sender_name: "AI Assistant",
  created_at: new Date().toISOString(),
};

describe("MessageBubble", () => {
  it("renders own message with correct alignment", () => {
    render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

    const messageText = screen.getByText("Hello World");
    expect(messageText).toBeInTheDocument();

    const container = messageText.closest("div");
    expect(container?.parentElement?.parentElement).toHaveClass("justify-end");
  });

  it("renders other message with correct alignment", () => {
    render(<MessageBubble message={mockOtherMessage} isOwn={false} />);

    const messageText = screen.getByText("Hi there!");
    expect(messageText).toBeInTheDocument();

    const senderName = screen.getByText("AI Assistant");
    expect(senderName).toBeInTheDocument();
  });

  it("does not show sender name for own messages", () => {
    render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

    const senderNames = screen.queryAllByText("User");
    expect(senderNames.length).toBe(0);
  });

  it("shows sender name for other messages", () => {
    render(<MessageBubble message={mockOtherMessage} isOwn={false} />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });
});
