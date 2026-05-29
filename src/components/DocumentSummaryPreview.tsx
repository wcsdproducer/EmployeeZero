"use client";

import { FileText, User, Calendar, File, ListChecks, Link as LinkIcon, Download } from "lucide-react";
import { Button } from "./ui/button";

export interface DocumentSummaryData {
  documentTitle: string;
  author?: string;
  date?: string;
  url?: string;
  overview: string;
  keyTakeaways: string[];
  actionItems?: string[];
  metadata?: Record<string, string>;
}

interface DocumentSummaryPreviewProps {
  summary: DocumentSummaryData;
}

export function DocumentSummaryPreview({ summary }: DocumentSummaryPreviewProps) {
  return (
    <div className="bg-white text-black p-6 rounded-xl border border-neutral-200 shadow-sm w-full max-w-[600px] font-sans mx-auto flex flex-col h-full">
      <div className="flex items-start justify-between border-b border-neutral-200 pb-4 mb-5 shrink-0">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
              <FileText size={20} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 leading-tight truncate" title={summary.documentTitle}>
              {summary.documentTitle}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-neutral-500 mt-2">
            {summary.author && (
              <div className="flex items-center gap-1.5">
                <User size={14} />
                <span className="truncate max-w-[150px]" title={summary.author}>{summary.author}</span>
              </div>
            )}
            {summary.date && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{summary.date}</span>
              </div>
            )}
          </div>
        </div>
        {summary.url && (
          <Button 
            variant="outline" 
            size="sm" 
            className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => window.open(summary.url, "_blank")}
          >
            <LinkIcon size={14} className="mr-1.5" />
            Open
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 text-sm pr-1 custom-scrollbar">
        <section>
          <h3 className="font-semibold text-neutral-900 mb-2 uppercase tracking-wider text-xs flex items-center gap-2">
            <File size={14} className="text-blue-500" />
            Executive Summary
          </h3>
          <p className="text-neutral-700 leading-relaxed bg-blue-50/50 p-4 rounded-lg border border-blue-100/50">
            {summary.overview}
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-neutral-900 mb-2 uppercase tracking-wider text-xs flex items-center gap-2">
            <ListChecks size={14} className="text-emerald-500" />
            Key Takeaways
          </h3>
          <ul className="space-y-3 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
            {summary.keyTakeaways.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-neutral-700">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {summary.actionItems && summary.actionItems.length > 0 && (
          <section>
            <h3 className="font-semibold text-neutral-900 mb-2 uppercase tracking-wider text-xs flex items-center gap-2">
              <Download size={14} className="text-amber-500" />
              Action Items & Recommendations
            </h3>
            <ul className="space-y-2">
              {summary.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-neutral-700 bg-amber-50/30 p-2.5 rounded-md border border-amber-100/50">
                  <span className="text-amber-500 mt-0.5 shrink-0 font-bold">→</span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.metadata && Object.keys(summary.metadata).length > 0 && (
          <section>
            <h3 className="font-semibold text-neutral-900 mb-2 uppercase tracking-wider text-xs text-neutral-500">
              Document Metadata
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(summary.metadata).map(([key, value]) => (
                <div key={key} className="bg-neutral-50 p-2 rounded border border-neutral-100">
                  <span className="text-neutral-500 block mb-0.5 capitalize">{key}</span>
                  <span className="text-neutral-800 font-medium truncate block" title={value}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
