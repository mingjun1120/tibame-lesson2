import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AUDIT_ACTION_CATEGORIES,
  AUDIT_OUTCOMES,
  type AuditLogDTO,
  type AuditOutcome,
} from "@vms/shared";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: "登入",
  employee: "員工",
  vehicle: "車輛",
  dashboard: "儀表板",
  audit: "稽核",
};

const OUTCOME_LABELS: Record<AuditOutcome, string> = {
  SUCCESS: "成功",
  FAILURE: "失敗",
};

const OUTCOME_BADGE: Record<AuditOutcome, string> = {
  SUCCESS: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  FAILURE: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

const ALL = "ALL";

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function formatTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 19);
}

function describeTarget(a: AuditLogDTO): string {
  if (!a.targetType) return "—";
  return a.targetId ? `${a.targetType}（${a.targetId.slice(0, 8)}…）` : a.targetType;
}

export function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>(ALL);
  const [outcome, setOutcome] = useState<"ALL" | AuditOutcome>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search, 300);

  const list = useQuery({
    queryKey: ["audit-logs", { search: debounced, action, outcome, from, to, page }],
    queryFn: async () => {
      const { data } = await apiClient.get<Page<AuditLogDTO>>("/audit-logs", {
        params: {
          search: debounced || undefined,
          action: action === ALL ? undefined : action,
          outcome,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize: 20,
        },
      });
      return data;
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">操作紀錄</h1>
        <p className="text-sm text-muted-foreground">
          稽核系統中使用者的登入、資料異動與讀取行為（僅供管理者查看）。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card/70 p-3 backdrop-blur-sm">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Label htmlFor="search">操作者</Label>
          <Input
            id="search"
            placeholder="帳號關鍵字"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="w-36">
          <Label>動作類別</Label>
          <Select
            value={action}
            onValueChange={(v) => {
              setPage(1);
              setAction(v);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部</SelectItem>
              {AUDIT_ACTION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32">
          <Label>結果</Label>
          <Select
            value={outcome}
            onValueChange={(v) => {
              setPage(1);
              setOutcome(v as "ALL" | AuditOutcome);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              {AUDIT_OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>
                  {OUTCOME_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label htmlFor="from">起始日</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </div>
        <div className="w-40">
          <Label htmlFor="to">結束日</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/70 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>時間</TableHead>
              <TableHead>操作者</TableHead>
              <TableHead>動作</TableHead>
              <TableHead>目標</TableHead>
              <TableHead>結果</TableHead>
              <TableHead>狀態碼</TableHead>
              <TableHead>來源 IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((a, idx) => (
              <TableRow
                key={a.id}
                className="row-in transition hover:-translate-y-px hover:shadow-card-lift"
                style={{ animationDelay: `${Math.min(idx, 20) * 30}ms` }}
              >
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {formatTime(a.createdAt)}
                </TableCell>
                <TableCell>{a.actorUsername ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{a.action}</TableCell>
                <TableCell className="text-muted-foreground">{describeTarget(a)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_BADGE[a.outcome]}`}
                  >
                    {OUTCOME_LABELS[a.outcome]}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{a.statusCode}</TableCell>
                <TableCell className="text-muted-foreground">{a.ip ?? "—"}</TableCell>
              </TableRow>
            ))}
            {list.data && list.data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  尚無紀錄
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {list.data && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {list.data.page} / {list.data.totalPages} 頁（共 {list.data.total} 筆）
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= list.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}
