import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MessageInput } from "../components/MessageInput";

describe("MessageInput", () => {
  it("includes the selected crop name when sending a message", () => {
    const onSendMessage = vi.fn();

    render(
      <MessageInput
        onSendMessage={onSendMessage}
        onTypingStart={vi.fn()}
        onTypingStop={vi.fn()}
        cropName="tomato"
      />,
    );

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter", charCode: 13 });

    expect(onSendMessage).toHaveBeenCalledWith("Hello world", "tomato");
  });
});
