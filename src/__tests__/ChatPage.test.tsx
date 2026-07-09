import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders login form", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile Number")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("navigates to chat on successful login", async () => {
    const mockResponse = {
      success: true,
      message: "Login successful",
      data: {
        success: true,
        message: "Login Successfull!",
        token: "mock-token",
        data: {
          id: 50591,
          name: "Farmer A",
          mobile: "(+88) 01799-999-444",
          base_image: "test.jpg",
          nid: "123456",
          settings: {},
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => mockResponse,
    } as Response);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText("Mobile Number"), {
      target: { value: "(+88) 01799-999-444" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Hello@123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/chat");
    });
  });

  it("stores user data in localStorage on successful login", async () => {
    const mockResponse = {
      success: true,
      data: {
        success: true,
        token: "mock-token",
        data: {
          id: 50591,
          name: "Farmer A",
          mobile: "(+88) 01799-999-444",
          base_image: "test.jpg",
          nid: "123456",
          settings: {},
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => mockResponse,
    } as Response);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText("Mobile Number"), {
      target: { value: "(+88) 01799-999-444" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Hello@123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("chatUser") || "{}");
      expect(stored.loginType).toBe("farmer");
      expect(stored.farmerId).toBe("50591");
      expect(stored.name).toBe("Farmer A");
      expect(stored.token).toBe("mock-token");
    });
  });

  it("shows error message on failed login", async () => {
    const mockResponse = {
      success: false,
      message: "Invalid credentials",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => mockResponse,
    } as Response);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText("Mobile Number"), {
      target: { value: "wrong" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
