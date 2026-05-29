import { z } from "zod";
import type { Role } from "../types.js";

// 稽核結果 (outcome)：依 HTTP 狀態碼推導，< 400 為 SUCCESS，否則 FAILURE。
export const AUDIT_OUTCOMES = ["SUCCESS", "FAILURE"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

// 動作類別 (category)：action 的前綴，供列表頁以類別篩選。
export const AUDIT_ACTION_CATEGORIES = [
  "auth",
  "employee",
  "vehicle",
  "dashboard",
  "audit",
] as const;
export type AuditActionCategory = (typeof AUDIT_ACTION_CATEGORIES)[number];

// 語意化動作 (action) 受控詞彙：涵蓋所有已知端點。未知路徑由後端 deriveAction 退回
// `${resource}.${method}` 以避免漏記（見 design.md D3）。
export const AUDIT_ACTIONS = [
  "auth.login.success",
  "auth.login.failure",
  "auth.logout",
  "auth.session.read",
  "auth.register.blocked",
  "employee.read.list",
  "employee.read.detail",
  "employee.create",
  "employee.update",
  "employee.reset_password",
  "employee.delete.blocked",
  "vehicle.read.list",
  "vehicle.read.detail",
  "vehicle.create",
  "vehicle.update",
  "vehicle.delete",
  "dashboard.read",
  "audit.read.list",
  "audit.read.detail",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const auditLogListQuerySchema = z.object({
  ...pageFields,
  // 比對 actorUsername（含部分字串）。
  search: z.string().optional(),
  // 單一 action（如 `employee.create`）或類別前綴（如 `employee`）。
  action: z.string().optional(),
  outcome: z.enum([...AUDIT_OUTCOMES, "ALL"] as const).default("ALL"),
  // createdAt 日期區間（含端點）。
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;

// 對外輸出 (DTO)：時間以 ISO 字串呈現，metadata 為任意 JSON。
export interface AuditLogDTO {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorUsername: string | null;
  actorRole: Role | null;
  action: string;
  method: string;
  path: string;
  targetType: string | null;
  targetId: string | null;
  outcome: AuditOutcome;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
}
