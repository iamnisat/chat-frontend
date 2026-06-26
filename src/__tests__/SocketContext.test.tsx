import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocketProvider, useSocketContext } from "../context/SocketContext";

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    id: "mock-socket-id",
    connected: true,
  })),
}));

function TestComponent() {
  const { isConnected, socketId } = useSocketContext();
  return (
    <div>
      <span data-testid="connected">{isConnected.toString()}</span>
      <span data-testid="socket-id">{socketId || "none"}</span>
    </div>
  );
}

describe("SocketContext", () => {
  it("provides socket context to children", () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(screen.getByTestId("connected")).toBeInTheDocument();
    expect(screen.getByTestId("socket-id")).toBeInTheDocument();
  });

  it("throws error when used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useSocketContext must be used within a SocketProvider");

    consoleSpy.mockRestore();
  });
});
