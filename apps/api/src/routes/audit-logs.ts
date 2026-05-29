import { Router } from "express";
import { Prisma } from "@prisma/client";
import { AUDIT_ACTION_CATEGORIES, auditLogListQuerySchema } from "@vms/shared";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { serializeAuditLog } from "../services/audit-serializer.js";

export const auditLogsRouter: Router = Router();

// 稽核紀錄唯讀，且僅限 admin 查閱。
auditLogsRouter.use(requireAuth, requireAdmin);

auditLogsRouter.get("/", async (req, res) => {
  const q = auditLogListQuerySchema.parse(req.query);
  const where: Prisma.AuditLogWhereInput = {};

  if (q.outcome !== "ALL") where.outcome = q.outcome;
  if (q.search) {
    where.actorUsername = { contains: q.search, mode: "insensitive" };
  }
  if (q.action) {
    // 類別前綴（如 `employee`）→ startsWith `employee.`；否則視為單一 action。
    if ((AUDIT_ACTION_CATEGORIES as readonly string[]).includes(q.action)) {
      where.action = { startsWith: `${q.action}.` };
    } else {
      where.action = q.action;
    }
  }
  if (q.from || q.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (q.from) createdAt.gte = q.from;
    if (q.to) createdAt.lte = q.to;
    where.createdAt = createdAt;
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  res.json({
    items: rows.map(serializeAuditLog),
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

auditLogsRouter.get("/:id", async (req, res) => {
  const a = await prisma.auditLog.findUnique({ where: { id: req.params.id } });
  if (!a) throw new HttpError(404, "AUDIT_LOG_NOT_FOUND", "找不到該稽核紀錄");
  res.json(serializeAuditLog(a));
});
