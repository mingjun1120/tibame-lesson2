import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "@/test/utils";
import { AuditLogsPage } from "./AuditLogs";
import { RequireAdmin } from "@/components/RequireAuth";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

beforeEach(() => {
  vi.mocked(apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: {
      items: [
        {
          id: "a1",
          createdAt: "2026-05-29T10:00:00.000Z",
          actorId: "u1",
          actorUsername: "admin1",
          actorRole: "ADMIN",
          action: "employee.create",
          method: "POST",
          path: "/api/employees",
          targetType: "employee",
          targetId: "emp-123",
          outcome: "SUCCESS",
          statusCode: 201,
          ip: "127.0.0.1",
          userAgent: "jest",
          metadata: null,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  });
});

function setUser(role: "ADMIN" | "USER") {
  useAuthStore.setState({
    user: { id: "u", name: "U", role, employeeId: "u", email: "u@x" },
    csrfToken: "csrf",
    hydrated: true,
  });
}

describe("AuditLogsPage", () => {
  it("admin sees list and filters", async () => {
    setUser("ADMIN");
    render(renderWithProviders(<AuditLogsPage />));
    expect(await screen.findByText("employee.create")).toBeInTheDocument();
    expect(screen.getByText("admin1")).toBeInTheDocument();
    // 篩選控制（以不會歧義的標籤斷言）
    expect(screen.getByLabelText("操作者")).toBeInTheDocument();
    expect(screen.getByText("動作類別")).toBeInTheDocument();
    expect(screen.getByLabelText("起始日")).toBeInTheDocument();
    expect(screen.getByLabelText("結束日")).toBeInTheDocument();
  });

  it("user is redirected away by RequireAdmin", async () => {
    setUser("USER");
    render(
      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route
            path="/audit-logs"
            element={
              <RequireAdmin>
                <AuditLogsPage />
              </RequireAdmin>
            }
          />
        </Routes>,
        ["/audit-logs"],
      ),
    );
    expect(await screen.findByText("home")).toBeInTheDocument();
    expect(screen.queryByText("操作紀錄")).toBeNull();
  });
});
