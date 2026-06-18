"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterConfig {
  param: string;
  placeholder: string;
  options: { label: string; value: string }[];
}

export function TableToolbar({
  searchPlaceholder = "Search…",
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      next.delete("page"); // reset pagination on filter change
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [params, pathname, router]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={params.get("search") ?? ""}
          placeholder={searchPlaceholder}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value;
            // debounce-lite
            const win = window as unknown as { __tt?: number };
            if (win.__tt) window.clearTimeout(win.__tt);
            win.__tt = window.setTimeout(() => setParam("search", value), 350);
          }}
        />
      </div>
      {filters.map((f) => (
        <Select
          key={f.param}
          defaultValue={params.get(f.param) ?? "all"}
          onValueChange={(v) => setParam(f.param, v)}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder={f.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{f.placeholder}</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
