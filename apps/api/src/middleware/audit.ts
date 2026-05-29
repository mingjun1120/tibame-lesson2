import type { Request, Response, NextFunction } from "express";
import type { AuditOutcome, Role } from "@vms/shared";
import { deriveAction, deriveTarget, record } from "../services/audit-logger.js";

interface AuditActor {
  id: string;
  username: string;
  role: Role;
}

// 在每個 /api/* 請求 response 結束時寫入一筆稽核紀錄（/api/health 除外）。
// 採 res.on("finish") 以取得最終狀態碼（含被 errorHandler 改寫後的 4xx/5xx），
// 並以 fire-and-forget 方式呼叫 record（best-effort，見 design.md D1/D5）。
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/api/health") return next();

  // 在進入點擷取 method/path/ip/UA：router 掛載會在處理過程中改寫 req.url/req.path，
  // res.on("finish") 時讀到的可能已非原始完整路徑。
  const method = req.method;
  const path = req.path;
  const ip = req.ip ?? null;
  const userAgent = req.get("user-agent") ?? null;

  res.on("finish", () => {
    const statusCode = res.statusCode;
    const outcome: AuditOutcome = statusCode < 400 ? "SUCCESS" : "FAILURE";
    const action = deriveAction(method, path, outcome);
    const { targetType, targetId } = deriveTarget(path);

    // actor 來源優先序：handler 設定的 res.locals.auditActor → requireAuth 的 req.user → 匿名。
    const localsActor = res.locals.auditActor as AuditActor | undefined;
    const localsUsername = res.locals.auditUsername as string | undefined;
    const actorId = localsActor?.id ?? req.user?.id ?? null;
    const actorUsername =
      localsActor?.username ?? localsUsername ?? req.user?.username ?? null;
    const actorRole = localsActor?.role ?? req.user?.role ?? null;
    const metadata = res.locals.auditMeta ?? null;

    void record({
      actorId,
      actorUsername,
      actorRole,
      action,
      method,
      path,
      targetType,
      targetId,
      outcome,
      statusCode,
      ip,
      userAgent,
      metadata,
    });
  });

  next();
}
