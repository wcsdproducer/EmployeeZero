/**
 * PDF Generation Tool — Creates formatted PDF documents and uploads to Google Drive.
 * 
 * Supports:
 * - Title, headers, body text
 * - Bullet points and numbered lists
 * - Tables
 * - Markdown-like formatting (bold, italic)
 * - Auto page breaks
 */

import PDFDocument from "pdfkit";
import { getAuthenticatedDrive } from "@/lib/drive";
import { Readable } from "stream";

interface PDFOptions {
  title: string;
  content: string;        // Markdown-like formatted text
  author?: string;
  folderId?: string;      // Optional Drive folder
}

/** Convert a PDFDocument stream to a Buffer */
function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/** Parse markdown-style content and render to PDFKit document */
function renderContent(doc: PDFKit.PDFDocument, content: string) {
  const lines = content.split("\n");
  const pageWidth = doc.page.width - 144; // 72pt margins on each side

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      doc.moveDown(0.5);
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(13).fillColor("#333333")
        .text(trimmed.replace(/^### /, ""), { width: pageWidth });
      doc.moveDown(0.3);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(15).fillColor("#222222")
        .text(trimmed.replace(/^## /, ""), { width: pageWidth });
      doc.moveDown(0.3);
      // Underline
      const y = doc.y;
      doc.strokeColor("#cccccc").lineWidth(0.5)
        .moveTo(72, y).lineTo(72 + pageWidth, y).stroke();
      doc.moveDown(0.3);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111")
        .text(trimmed.replace(/^# /, ""), { width: pageWidth });
      doc.moveDown(0.5);
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      doc.moveDown(0.3);
      const y = doc.y;
      doc.strokeColor("#dddddd").lineWidth(0.5)
        .moveTo(72, y).lineTo(72 + pageWidth, y).stroke();
      doc.moveDown(0.5);
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      const text = trimmed.replace(/^[-•*]\s+/, "");
      doc.font("Helvetica").fontSize(11).fillColor("#333333")
        .text(`  •  ${text}`, { width: pageWidth, indent: 10 });
      doc.moveDown(0.2);
      continue;
    }

    // Numbered lists
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      doc.font("Helvetica").fontSize(11).fillColor("#333333")
        .text(`  ${numberedMatch[1]}.  ${numberedMatch[2]}`, { width: pageWidth, indent: 10 });
      doc.moveDown(0.2);
      continue;
    }

    // Table rows (pipe-delimited)
    if (trimmed.includes("|") && !trimmed.startsWith("|--") && !trimmed.match(/^\|[\s-]+\|$/)) {
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length > 1) {
        // Check if this is a header separator row
        if (cells.every(c => /^[-:]+$/.test(c))) continue;

        const isHeader = i > 0 && lines[i + 1]?.trim().startsWith("|--") || 
                         (i > 0 && lines[i + 1]?.trim().match(/^\|[\s-:|]+\|$/));
        const font = isHeader ? "Helvetica-Bold" : "Helvetica";
        const cellWidth = pageWidth / cells.length;
        
        const startX = 72;
        const startY = doc.y;
        
        cells.forEach((cell, idx) => {
          doc.font(font).fontSize(10).fillColor("#333333")
            .text(cell, startX + (idx * cellWidth), startY, { 
              width: cellWidth - 8, 
              align: idx === 0 ? "left" : "right" 
            });
        });
        
        doc.y = startY + 16;
        doc.moveDown(0.1);
        continue;
      }
    }

    // Bold text (**text**)
    const hasBold = trimmed.includes("**");
    if (hasBold) {
      // Simple bold rendering - alternate between normal and bold
      const parts = trimmed.split(/\*\*/);
      const startX = 72;
      let xPos = startX;
      const y = doc.y;
      
      parts.forEach((part, idx) => {
        if (!part) return;
        const isBold = idx % 2 === 1;
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(11).fillColor("#333333");
        doc.text(part, xPos, y, { continued: idx < parts.length - 1, width: pageWidth });
      });
      doc.moveDown(0.3);
      continue;
    }

    // Regular text
    doc.font("Helvetica").fontSize(11).fillColor("#333333")
      .text(trimmed, { width: pageWidth, lineGap: 2 });
    doc.moveDown(0.3);
  }
}

/** Generate a PDF and upload to Google Drive */
export async function createPDF(
  userId: string,
  options: PDFOptions
): Promise<{ success: boolean; documentId: string; name: string; link: string; size: string }> {
  const { title, content, author, folderId } = options;

  // Create PDF
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    info: {
      Title: title,
      Author: author || "Employee Zero",
      Creator: "Employee Zero",
    },
  });

  const bufferPromise = pdfToBuffer(doc);

  // Title page header
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#111111")
    .text(title, { align: "center" });
  doc.moveDown(0.3);

  // Date
  const dateStr = new Date().toLocaleDateString("en-US", { 
    year: "numeric", month: "long", day: "numeric" 
  });
  doc.font("Helvetica").fontSize(10).fillColor("#888888")
    .text(dateStr, { align: "center" });
  if (author) {
    doc.font("Helvetica").fontSize(10).fillColor("#888888")
      .text(`Prepared by ${author}`, { align: "center" });
  }
  doc.moveDown(1);

  // Divider
  const y = doc.y;
  const pageWidth = doc.page.width - 144;
  doc.strokeColor("#4A90D9").lineWidth(1.5)
    .moveTo(72, y).lineTo(72 + pageWidth, y).stroke();
  doc.moveDown(1);

  // Render body content
  renderContent(doc, content);

  // Footer
  doc.moveDown(2);
  const footerY = doc.y;
  doc.strokeColor("#eeeeee").lineWidth(0.5)
    .moveTo(72, footerY).lineTo(72 + pageWidth, footerY).stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(8).fillColor("#aaaaaa")
    .text(`Generated by Employee Zero • ${dateStr}`, { align: "center" });

  doc.end();

  const pdfBuffer = await bufferPromise;
  const sizeKB = Math.round(pdfBuffer.length / 1024);

  // Upload to Google Drive
  const driveClient = await getAuthenticatedDrive(userId);
  const fileName = `${title.replace(/[^a-zA-Z0-9\s-]/g, "").trim()}.pdf`;
  
  const fileMetadata: any = { name: fileName, mimeType: "application/pdf" };
  if (folderId) fileMetadata.parents = [folderId];

  const media = {
    mimeType: "application/pdf",
    body: Readable.from(pdfBuffer),
  };

  const res = await driveClient.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink",
  });

  return {
    success: true,
    documentId: res.data.id || "",
    name: res.data.name || fileName,
    link: res.data.webViewLink || "",
    size: `${sizeKB} KB`,
  };
}
