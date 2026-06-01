"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, Image as ImageIcon, Code, Box, MessageCircle, CalendarDays, FileText, ExternalLink, FileIcon, Download } from "lucide-react";
import { Button } from "./ui/button";
import { AgentChart } from "./AgentChart";
import { SocialPostPreview } from "./SocialPostPreview";
import { MeetingBriefPreview } from "./MeetingBriefPreview";
import { DocumentSummaryPreview } from "./DocumentSummaryPreview";
import ReactMarkdown from "react-markdown";

export interface DisplayContent {
  type: "chart" | "image" | "code" | "custom" | string;
  title: string;
  props?: any;
}

interface DisplayPanelProps {
  content: DisplayContent | null;
  onClose: () => void;
}

export function DisplayPanel({ content, onClose }: DisplayPanelProps) {
  // Determine icon based on type
  const getIcon = () => {
    switch (content?.type) {
      case "chart":
        return <BarChart3 size={18} className="text-blue-400" />;
      case "image":
        return <ImageIcon size={18} className="text-pink-400" />;
      case "document_preview":
        return <FileIcon size={18} className="text-cyan-400" />;
      case "social_post":
        return <MessageCircle size={18} className="text-blue-400" />;
      case "meeting_brief":
        return <CalendarDays size={18} className="text-purple-400" />;
      case "document_summary":
        return <FileText size={18} className="text-emerald-400" />;
      case "code":
        return <Code size={18} className="text-amber-400" />;
      default:
        return <Box size={18} className="text-green-400" />;
    }
  };

  // Render content based on type
  const renderContent = () => {
    if (!content) return null;

    switch (content.type) {
      case "chart":
        return (
          <div className="flex-1 w-full h-full min-h-[400px]">
            <AgentChart spec={content.props?.spec || {}} />
          </div>
        );
      case "image":
        return (
          <div className="flex items-center justify-center h-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={content.props?.src} 
              alt={content.title} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
            />
          </div>
        );
      case "document_preview": {
        const { url, fileType, downloadUrl } = content.props || {};
        // Build embed URL based on file type
        let embedUrl = url;
        if (url?.includes("drive.google.com")) {
          // Google Drive file — use preview embed
          const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
          }
        } else if (url?.includes("docs.google.com/document")) {
          embedUrl = url.replace(/\/edit.*$/, "/preview");
        } else if (url?.includes("docs.google.com/spreadsheets")) {
          embedUrl = url.replace(/\/edit.*$/, "/preview");
        } else if (url?.includes("docs.google.com/presentation")) {
          embedUrl = url.replace(/\/edit.*$/, "/embed?start=false&loop=false&delayms=3000");
        } else if (fileType === "image" || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url || "")) {
          return (
            <div className="flex items-center justify-center h-full p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={content.title} className="max-w-full max-h-full object-contain rounded-lg shadow-xl" />
            </div>
          );
        }
        // For PDFs and Google Drive embeds, use iframe
        return (
          <div className="flex flex-col h-full w-full -m-6">
            <iframe
              src={embedUrl}
              className="flex-1 w-full border-0 bg-white rounded-b-lg"
              style={{ minHeight: "calc(100vh - 120px)" }}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={content.title}
            />
          </div>
        );
      }
      case "social_post":
        return (
          <div className="flex items-start justify-center h-full p-4 w-full">
            <SocialPostPreview post={content.props} />
          </div>
        );
      case "meeting_brief":
        return (
          <div className="flex items-start justify-center h-full p-4 w-full">
            <MeetingBriefPreview brief={content.props} />
          </div>
        );
      case "document_summary":
        return (
          <div className="flex items-start justify-center h-full p-4 w-full">
            <DocumentSummaryPreview summary={content.props} />
          </div>
        );
      case "code":
        return (
          <div className="p-4 overflow-auto h-full text-sm font-mono text-neutral-300">
             <ReactMarkdown
               components={{
                 pre: ({ children }) => <pre className="bg-[#1a1a1a] rounded-xl p-4 overflow-x-auto">{children}</pre>,
                 code: ({ children }) => <code>{children}</code>
               }}
             >
               {`\`\`\`\n${content.props?.code || ""}\n\`\`\``}
             </ReactMarkdown>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-neutral-500">
            Unsupported content type: {content.type}
          </div>
        );
    }
  };

  const panelWidth = content?.type === "document_preview" ? "550px" : "450px";

  return (
    <AnimatePresence>
      {content && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="h-full border-l border-white/10 bg-[#0a0a0a] flex flex-col shadow-2xl flex-shrink-0 z-20"
        >
          {/* Header */}
          <div className="h-[60px] min-h-[60px] border-b border-white/10 px-4 flex items-center justify-between bg-[#0d0d0d]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-1.5 bg-white/5 rounded-md">
                {getIcon()}
              </div>
              <h2 className="text-sm font-medium text-white truncate pr-4">
                {content.title}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {content.type === "document_preview" && content.props?.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white"
                  onClick={() => window.open(content.props.url, "_blank")}
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </Button>
              )}
              {content.type === "document_preview" && content.props?.downloadUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white"
                  onClick={() => window.open(content.props.downloadUrl, "_blank")}
                  title="Download"
                >
                  <Download size={14} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white"
                onClick={onClose}
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto w-full p-6">
            {renderContent()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
