import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { setAccessToken } from "../src/lib/api";

// Mock the axios api module
vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    api: {
      post: vi.fn(),
      get: vi.fn(),
    },
  };
});

import { api } from "../src/lib/api";
const mockApi = api as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

const MOCK_USER = { id: "u1", email: "jane@example.com", name: "Jane", currency: "USD" };
const MOCK_TOKEN = "access-token-abc";

function TestConsumer() {
  const { user, isLoading, login, logout, register } = useAuth();
  if (isLoading) return <div>Loading…</div>;
  if (!user) {
    return (
      <>
        <button onClick={() => login("jane@example.com", "password123")}>Login</button>
        <button onClick={() => register("jane@example.com", "password123", "Jane")}>Register</button>
      </>
    );
  }
  return (
    <>
      <div data-testid="user-name">{user.name}</div>
      <button onClick={logout}>Logout</button>
    </>
  );
}

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
});

describe("AuthContext", () => {
  it("shows loading then unauthenticated when no session exists", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("No session"));

    renderWithProviders();
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Login")).toBeInTheDocument());
  });

  it("restores session on mount when refresh cookie is valid", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { data: { accessToken: MOCK_TOKEN, user: MOCK_USER } },
    });

    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId("user-name")).toHaveTextContent("Jane"));
  });

  it("login sets the user", async () => {
    // First call: refresh fails (no session)
    mockApi.post.mockRejectedValueOnce(new Error("No session"));
    // Second call: login succeeds
    mockApi.post.mockResolvedValueOnce({
      data: { data: { accessToken: MOCK_TOKEN, user: MOCK_USER } },
    });

    renderWithProviders();
    await waitFor(() => expect(screen.getByText("Login")).toBeInTheDocument());

    await act(() => userEvent.click(screen.getByText("Login")));

    await waitFor(() => expect(screen.getByTestId("user-name")).toHaveTextContent("Jane"));
  });

  it("logout clears the user", async () => {
    mockApi.post
      .mockResolvedValueOnce({ data: { data: { accessToken: MOCK_TOKEN, user: MOCK_USER } } }) // refresh
      .mockResolvedValueOnce({}); // logout

    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId("user-name")).toBeInTheDocument());

    await act(() => userEvent.click(screen.getByText("Logout")));

    await waitFor(() => expect(screen.getByText("Login")).toBeInTheDocument());
  });

  it("register sets the user", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("No session"));
    mockApi.post.mockResolvedValueOnce({
      data: { data: { accessToken: MOCK_TOKEN, user: MOCK_USER } },
    });

    renderWithProviders();
    await waitFor(() => expect(screen.getByText("Register")).toBeInTheDocument());

    await act(() => userEvent.click(screen.getByText("Register")));

    await waitFor(() => expect(screen.getByTestId("user-name")).toHaveTextContent("Jane"));
  });
});
