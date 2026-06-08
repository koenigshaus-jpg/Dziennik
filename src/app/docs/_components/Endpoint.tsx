import * as React from "react";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  POST: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  PUT: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  PATCH: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  DELETE: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

interface EndpointProps {
  method: Method;
  path: string;
  id?: string;
  children: React.ReactNode;
}

export function Endpoint({ method, path, id, children }: EndpointProps) {
  return (
    <section
      id={id}
      className="mt-10 scroll-mt-24 border-t border-border pt-8 first:border-t-0 first:pt-0"
    >
      <h3 className="mb-4 flex flex-wrap items-center gap-2 font-mono text-base">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${METHOD_STYLES[method]}`}
        >
          {method}
        </span>
        <span className="break-all text-foreground">{path}</span>
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

interface ParamsTableProps {
  rows: Array<{
    name: string;
    type: string;
    required?: boolean;
    description: React.ReactNode;
  }>;
}

export function ParamsTable({ rows }: ParamsTableProps) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-foreground/5 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Pole</th>
            <th className="px-3 py-2 font-medium">Typ</th>
            <th className="px-3 py-2 font-medium">Opis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-xs">
                {r.name}
                {r.required ? <span className="ml-1 text-rose-400">*</span> : null}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted">{r.type}</td>
              <td className="px-3 py-2">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
