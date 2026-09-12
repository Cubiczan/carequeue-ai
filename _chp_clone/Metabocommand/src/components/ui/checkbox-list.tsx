"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxListProps {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function CheckboxList({ label, options, selected, onChange }: CheckboxListProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const allSelected = selected.size === options.length;
  const summary =
    selected.size === 0
      ? `All ${label.toLowerCase()}`
      : allSelected
      ? `All ${label.toLowerCase()}`
      : selected.size === 1
      ? Array.from(selected)[0]
      : `${selected.size} selected`;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(options));
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center justify-between gap-2 w-48 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50",
          open && "ring-2 ring-slate-950"
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-xs">
            <button onClick={selectAll} className="text-slate-700 hover:text-slate-900 font-medium">
              Select all
            </button>
            <button onClick={clearAll} className="text-slate-500 hover:text-slate-900">
              Clear
            </button>
          </div>
          <ul>
            {options.map((opt) => {
              const checked = selected.has(opt);
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => toggle(opt)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        checked ? "bg-slate-900 border-slate-900" : "border-slate-300"
                      )}
                    >
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
