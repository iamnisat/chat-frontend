import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders login form", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Chat Login")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Farmer")).toBeInTheDocument();
    expect(screen.getByText("Start Chatting")).toBeInTheDocument();
  });

  it("allows selecting login type", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Farmer"));
    expect(screen.getByText("Farmer ID")).toBeInTheDocument();
  });

  it("navigates to chat on form submission", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Start Chatting"));
    expect(mockNavigate).toHaveBeenCalledWith("/chat");
  });

  it("stores user data in localStorage", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Start Chatting"));
    const stored = JSON.parse(localStorage.getItem("chatUser") || "{}");
    expect(stored.loginType).toBe("user");
  });
});
