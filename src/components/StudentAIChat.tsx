"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bot, Sparkles, Send, X, FileText, Loader2, RotateCcw, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StudentAIChatProps {
  studentData: any;
  metrics: any;
  classStats: {
    totalStudents: number;
    meanSgpa: number;
    meanCgpa: number;
    stdDev: number;
    stdDevCgpa: number;
    topperName: string;
    topperSgpa: number;
    branchName: string;
  };
}

// ── Markdown Renderer ──────────────────────────────────────────────
function FormattedMessage({ content, role }: { content: string; role: string }) {
  if (role === 'user') return <span>{content}</span>;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const t = line.trim();

    if (t.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="font-extrabold text-[13px] mt-4 mb-1 text-accent uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-5 bg-accent rounded-full inline-block" />
          {fmt(t.slice(4))}
        </h4>
      );
      return;
    }
    if (t.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="font-extrabold text-base mt-4 mb-1 text-slate-900 border-b border-slate-100 pb-1">
          {fmt(t.slice(3))}
        </h3>
      );
      return;
    }
    if (t.startsWith('> ')) {
      elements.push(
        <div key={i} className="my-2 px-3 py-2 bg-accent/5 border-l-4 border-accent rounded-r-lg text-sm italic text-slate-600 leading-relaxed">
          {fmt(t.slice(2))}
        </div>
      );
      return;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-1 my-0.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="text-sm leading-relaxed">{fmt(t.slice(2))}</span>
        </div>
      );
      return;
    }
    const num = t.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      elements.push(
        <div key={i} className="flex items-start gap-2.5 ml-1 my-1">
          <span className="mt-0.5 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">{num[1]}</span>
          <span className="text-sm leading-relaxed">{fmt(num[2])}</span>
        </div>
      );
      return;
    }
    if (t === '---' || t === '***') {
      elements.push(<hr key={i} className="my-3 border-slate-100" />);
      return;
    }
    if (t === '') { elements.push(<div key={i} className="h-1.5" />); return; }
    elements.push(<p key={i} className="text-sm leading-relaxed my-0.5">{fmt(t)}</p>);
  });

  return <div className="space-y-0.5">{elements}</div>;
}

function fmt(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const rx = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m, k = 0;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={k++} className="font-bold text-slate-900">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++} className="italic">{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k++} className="bg-slate-100 text-accent px-1 py-0.5 rounded text-xs font-mono">{m[4]}</code>);
    last = rx.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ── PDF Generator ──────────────────────────────────────────────────
function generatePDF(
  content: string,
  studentData: any,
  metrics: any,
  classStats: any
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = W - margin * 2;
  let y = 0;

  // ── Colors
  const accent: [number, number, number] = [139, 92, 246];    // Violet
  const pink: [number, number, number] = [244, 114, 182];
  const mint: [number, number, number] = [52, 211, 153];
  const yellow: [number, number, number] = [251, 191, 36];
  const dark: [number, number, number] = [30, 41, 59];
  const light: [number, number, number] = [248, 250, 252];

  // ── Helper: check page overflow
  const checkPage = (need: number) => {
    if (y + need > H - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Tokenizer and Wrap Helper
  interface Token {
    text: string;
    bold: boolean;
    isSpace: boolean;
  }

  const wrapTextToTokens = (
    textStr: string,
    targetWidth: number,
    fontSize = 8.5
  ): Token[][] => {
    doc.setFontSize(fontSize);
    
    // Tokenize
    const tokens: Token[] = [];
    const rx = /(\*\*[^*]+\*\*|[^\s*]+|\s+)/g;
    let match;
    while ((match = rx.exec(textStr)) !== null) {
      const raw = match[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        const contentVal = raw.slice(2, -2);
        const subRx = /(\s+|[^\s]+)/g;
        let subMatch;
        while ((subMatch = subRx.exec(contentVal)) !== null) {
          tokens.push({
            text: subMatch[0],
            bold: true,
            isSpace: /^\s+$/.test(subMatch[0])
          });
        }
      } else {
        tokens.push({
          text: raw.replace(/\*/g, '').replace(/`/g, ''),
          bold: false,
          isSpace: /^\s+$/.test(raw)
        });
      }
    }

    // Width helper
    const getWidth = (tok: Token) => {
      if (tok.bold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      return doc.getTextWidth(tok.text);
    };

    // Wrap tokens into lines
    const linesOfTokens: Token[][] = [];
    let currentLine: Token[] = [];
    let currentLineWidth = 0;

    tokens.forEach((tok) => {
      if (tok.isSpace && currentLine.length === 0) {
        return; // skip leading space
      }
      const w = getWidth(tok);
      if (currentLineWidth + w > targetWidth) {
        if (tok.isSpace) {
          linesOfTokens.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        } else {
          if (currentLine.length === 0) {
            currentLine.push(tok);
            linesOfTokens.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          } else {
            linesOfTokens.push(currentLine);
            currentLine = [tok];
            currentLineWidth = w;
          }
        }
      } else {
        currentLine.push(tok);
        currentLineWidth += w;
      }
    });
    if (currentLine.length > 0) {
      linesOfTokens.push(currentLine);
    }

    return linesOfTokens;
  };

  const renderLinesOfTokens = (
    linesOfTokens: Token[][],
    startX: number,
    fontSize = 8.5,
    lineHeight = 4.5
  ) => {
    doc.setFontSize(fontSize);
    linesOfTokens.forEach((line) => {
      checkPage(lineHeight);
      let x = startX;
      line.forEach((tok) => {
        if (tok.bold) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(tok.text, x, y + 3.5);
        x += doc.getTextWidth(tok.text);
      });
      y += lineHeight;
    });
  };

  // ══════════════════════════════════════════════════════════════
  //  PAGE 1: COVER / HEADER
  // ══════════════════════════════════════════════════════════════

  // Top accent bar
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 40, 'F');

  // Decorative circles
  doc.setFillColor(255, 255, 255, 0.1);
  doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.circle(W - 25, 15, 30, 'F');
  doc.circle(30, 35, 20, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Title on bar
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AI INTELLIGENCE REPORT', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by NVIDIA Nemotron · CoBuddy Academic Engine', margin, 27);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 34);

  y = 50;

  // ── Student Info Card
  doc.setFillColor(...light);
  doc.roundedRect(margin, y, contentW, 36, 3, 3, 'F');
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 36, 3, 3, 'S');

  // Left accent bar inside card
  doc.setFillColor(...accent);
  doc.rect(margin, y, 3, 36, 'F');

  doc.setTextColor(...dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(studentData?.name || 'Student', margin + 8, y + 9);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Reg No: ${studentData?.redg_no}  |  College: ${studentData?.college_name || 'MIT Muzaffarpur'}`, margin + 8, y + 16);
  doc.text(`Branch: ${classStats.branchName}  |  Semester: ${studentData?.semester}`, margin + 8, y + 22);

  // Stats row
  const statsY = y + 30;
  const stats = [
    { label: 'SGPA', value: metrics?.currentSgpa?.toFixed(2), color: accent },
    { label: 'CGPA', value: metrics?.currentCgpa?.toFixed(2), color: pink },
    { label: 'RANK', value: `#${metrics?.rank}/${classStats.totalStudents}`, color: mint },
    { label: 'STATUS', value: metrics?.displayStatus?.split(' ')[0], color: metrics?.displayStatus === 'PASS' ? mint : [239, 68, 68] },
  ];

  const statW = contentW / stats.length;
  stats.forEach((s, i) => {
    const sx = margin + i * statW;
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label, sx + 8, statsY);
    doc.setFontSize(10);
    doc.setTextColor(...(s.color as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.text(String(s.value || 'N/A'), sx + 8 + doc.getTextWidth(s.label) + 3, statsY);
  });

  y += 44;

  // ══════════════════════════════════════════════════════════════
  //  AI CONTENT RENDERING
  // ══════════════════════════════════════════════════════════════

  const cleanContent = content.replace(/\r/g, '');
  const lines = cleanContent.split('\n');

  lines.forEach((line) => {
    const t = line.trim();
    if (t === '') { y += 3; return; }

    // ── Section Heading (##)
    if (t.startsWith('## ')) {
      checkPage(14);
      const headText = t.slice(3).replace(/\*\*/g, '');
      y += 4;
      doc.setFillColor(...accent);
      doc.roundedRect(margin, y - 1, contentW, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(headText.toUpperCase(), margin + 4, y + 5);
      y += 14;
      return;
    }

    // ── Sub-heading (###)
    if (t.startsWith('### ')) {
      checkPage(12);
      const subText = t.slice(4).replace(/\*\*/g, '');
      y += 3;
      doc.setFillColor(...accent);
      doc.rect(margin, y, 2, 6, 'F');
      doc.setTextColor(...accent);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(subText.toUpperCase(), margin + 5, y + 5);
      y += 10;
      return;
    }

    // ── Blockquote (>)
    if (t.startsWith('> ')) {
      const quoteText = t.slice(2);
      const wrappedLines = wrapTextToTokens(quoteText, contentW - 14, 8.5);
      const qh = wrappedLines.length * 4.5 + 6;
      checkPage(qh);
      doc.setFillColor(245, 243, 255);
      doc.roundedRect(margin, y, contentW, qh, 2, 2, 'F');
      doc.setFillColor(...accent);
      doc.rect(margin, y, 2.5, qh, 'F');
      doc.setTextColor(88, 70, 160);
      
      const oldY = y;
      y += 1.5;
      renderLinesOfTokens(wrappedLines, margin + 7, 8.5, 4.5);
      y = oldY + qh + 3;
      return;
    }

    // ── Bullet point
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const bulletText = t.slice(2);
      const wrappedLines = wrapTextToTokens(bulletText, contentW - 10, 8.5);
      const lh = wrappedLines.length * 4.5 + 2;
      checkPage(lh);
      doc.setFillColor(...accent);
      doc.circle(margin + 3, y + 2.5, 1, 'F');
      doc.setTextColor(...dark);
      renderLinesOfTokens(wrappedLines, margin + 7, 8.5, 4.5);
      y += 2;
      return;
    }

    // ── Numbered list
    const numMatch = t.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const numText = numMatch[2];
      const wrappedLines = wrapTextToTokens(numText, contentW - 12, 8.5);
      const lh = wrappedLines.length * 4.5 + 2;
      checkPage(lh);
      doc.setFillColor(...accent);
      doc.circle(margin + 3, y + 2.5, 2.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(num, margin + 3 - doc.getTextWidth(num) / 2, y + 3.5);
      doc.setTextColor(...dark);
      renderLinesOfTokens(wrappedLines, margin + 9, 8.5, 4.5);
      y += 2;
      return;
    }

    // ── Horizontal rule
    if (t === '---' || t === '***') {
      checkPage(6);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y + 2, W - margin, y + 2);
      y += 5;
      return;
    }

    // ── Normal paragraph
    const wrappedLines = wrapTextToTokens(t, contentW, 8.5);
    const lh = wrappedLines.length * 4.5 + 2;
    checkPage(lh);
    doc.setTextColor(...dark);
    renderLinesOfTokens(wrappedLines, margin, 8.5, 4.5);
    y += 2;
  });

  // ── Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Bottom bar
    doc.setFillColor(...dark);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`BEU Results Analytics · AI Intelligence Report · ${studentData?.name}`, margin, H - 5);
    doc.text(`Page ${p} of ${totalPages}`, W - margin - 20, H - 5);

    // Accent line above footer
    doc.setDrawColor(...accent);
    doc.setLineWidth(1);
    doc.line(0, H - 12, W, H - 12);
  }

  doc.save(`AI_Report_${studentData?.name?.replace(/\s+/g, '_')}_${studentData?.redg_no}.pdf`);
}

// ── Main Component ─────────────────────────────────────────────────
export function StudentAIChat({ studentData, metrics, classStats }: StudentAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEffect(() => { setMessages([]); setInput(''); }, [studentData?.redg_no]);

  // ── System Prompt ────────────────────────────────────────────
  const systemPrompt: Message = useMemo(() => {
    const subDetails = metrics?.subjectDetails || [];
    const strengths = subDetails
      .filter((s: any) => s.diffFromAvg > 0 && !s.isBacklog)
      .sort((a: any, b: any) => b.diffFromAvg - a.diffFromAvg)
      .slice(0, 4)
      .map((s: any) => `${s.name} (scored ${s.total}, class avg ${s.classAvg.toFixed(1)}, +${s.diffFromAvg.toFixed(1)} above avg)`);

    const weaknesses = subDetails
      .filter((s: any) => s.diffFromAvg < 0 || s.isBacklog)
      .sort((a: any, b: any) => a.diffFromAvg - b.diffFromAvg)
      .slice(0, 4)
      .map((s: any) => `${s.name} (scored ${s.total}, class avg ${s.classAvg.toFixed(1)}, ${s.diffFromAvg.toFixed(1)} from avg${s.isBacklog ? ', BACKLOG' : ''})`);

    const trendData = metrics?.trendData?.filter((d: any) => d.sgpa > 0) || [];
    const trendStr = trendData.map((d: any) => `${d.name}: ${d.sgpa}`).join(', ');

    const percentileLabel = metrics?.percentile >= 90 ? 'top 10%'
      : metrics?.percentile >= 75 ? 'top 25%'
      : metrics?.percentile >= 50 ? 'top half'
      : 'bottom half';

    return {
      role: 'system' as const,
      content: `You are "CoBuddy", an elite AI Academic Intelligence Engine for Bihar Engineering University (BEU). You generate premium, insightful, human-like academic analysis that makes students feel truly understood.

## STUDENT PROFILE
- **Name**: ${studentData?.name}
- **Reg No**: ${studentData?.redg_no}
- **Branch**: ${classStats.branchName}
- **Semester**: ${studentData?.semester}

## ACADEMIC DATA
- **Current SGPA**: ${metrics?.currentSgpa?.toFixed(2)}
- **CGPA**: ${metrics?.currentCgpa?.toFixed(2)}
- **Class Rank (SGPA)**: #${metrics?.rank} out of ${classStats.totalStudents}
- **Percentile**: Top ${(100 - (metrics?.percentile || 0)).toFixed(0)}% (${percentileLabel})
- **Z-Score (SGPA)**: ${metrics?.zScore?.toFixed(2)}σ
- **Status**: ${metrics?.displayStatus}
- **Class Mean SGPA**: ${classStats.meanSgpa.toFixed(2)}
- **Class Std Dev**: ${classStats.stdDev.toFixed(2)}
- **Branch Topper**: ${classStats.topperName} (SGPA: ${classStats.topperSgpa.toFixed(2)})
- **SGPA Trend**: ${trendStr || 'N/A'}

## STRONGEST SUBJECTS (above class average)
${strengths.length > 0 ? strengths.map((s: string) => `- ${s}`).join('\n') : '- None detected'}

## WEAKEST SUBJECTS (below class average)
${weaknesses.length > 0 ? weaknesses.map((s: string) => `- ${s}`).join('\n') : '- None — all above average!'}

## YOUR RULES — FOLLOW STRICTLY
1. **Be conversational, warm, and intelligent** — never robotic. Sound like a brilliant mentor who genuinely cares.
2. **Never advise re-studying failed subjects** — students won't take them again. Instead, highlight what they're naturally good at and where their career potential lies.
3. **Keep the summary SHORT** — around 200-250 words maximum. Use bullet points and bold keywords.
4. **Use markdown formatting**: ## for sections, ### for subsections, **bold**, > blockquotes for key insights, - bullets.
5. **Include these sections in order**:
   - **Academic Persona** (one creative label like "Analytical Powerhouse" or "Consistent Climber" etc.)
   - **Performance Snapshot** (SGPA, rank, percentile — 2-3 sentences, conversational)
   - **Your Strengths** (top 2-3 subjects with insight on what skill pattern they reveal)
   - **Areas to Watch** (weaker areas — constructive, not insulting. Focus on strategy, not blame)
   - **Trend & Momentum** (is their SGPA rising/falling? What does it signal?)
   - **AI Verdict** (a motivational 1-2 sentence conclusion that feels cinematic)
6. For follow-up chat questions, give SHORT focused replies (3-5 sentences max). Don't repeat the full summary.
7. Use 1-2 emojis max. Don't overdo it.`
    };
  }, [studentData, metrics, classStats]);

  // ── AI Communication ─────────────────────────────────────────
  const fetchAIResponse = async (allMessages: Message[]) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [systemPrompt, ...allMessages] })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let assistantMessage = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: assistantMessage };
          return msgs;
        });
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Could not connect to the AI. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = () => {
    const msg: Message = { role: 'user', content: 'Generate my AI Intelligence Summary Report.' };
    setMessages([msg]);
    fetchAIResponse([msg]);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    fetchAIResponse(newMsgs);
  };

  const handleReset = () => { setMessages([]); setInput(''); };

  // ── PDF Download ─────────────────────────────────────────────
  const lastAIMessage = useMemo(() => {
    const aiMsgs = messages.filter(m => m.role === 'assistant' && m.content.length > 20);
    return aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].content : null;
  }, [messages]);

  const handleDownloadPDF = useCallback(() => {
    if (!lastAIMessage) return;
    generatePDF(lastAIMessage, studentData, metrics, classStats);
  }, [lastAIMessage, studentData, metrics, classStats]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* Floating Trigger */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); if (messages.length === 0) generateSummary(); }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group flex items-center gap-2 sm:gap-3 pl-4 sm:pl-5 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-accent text-white rounded-full border-2 border-border shadow-pop hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
        >
          <span className="text-xs sm:text-sm font-bold tracking-wide">AI Report</span>
          <div className="relative">
            <Bot size={22} className="group-hover:animate-bounce" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-quaternary rounded-full border-2 border-white animate-pulse" />
          </div>
        </button>
      )}

      {/* Chat Panel — fully responsive */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] sm:h-[620px] z-50 flex flex-col sm:rounded-2xl sm:border-2 border-border sm:shadow-pop bg-white overflow-hidden"
          style={{ animation: 'chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

          {/* ── Header ─────────────────────────── */}
          <div className="bg-gradient-to-r from-accent via-tertiary to-secondary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/90 rounded-xl border-2 border-white/30 shadow-sm">
                <Bot size={18} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide">AI CoBuddy</h3>
                <p className="text-[10px] font-medium text-white/70">NVIDIA Nemotron · Intelligence Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {/* Download PDF button */}
              {lastAIMessage && (
                <button
                  onClick={handleDownloadPDF}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  title="Download PDF Report"
                >
                  <Download size={14} />
                </button>
              )}
              <button onClick={handleReset} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors" title="Reset">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors" title="Close">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Messages ───────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 bg-gradient-to-b from-slate-50/80 to-white"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>

            {messages.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-6">
                <div className="relative">
                  <div className="p-5 bg-accent/10 rounded-2xl border-2 border-accent/20">
                    <Sparkles className="text-accent w-10 h-10" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-quaternary rounded-full border-2 border-white animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800">AI Intelligence Report</h3>
                  <p className="text-sm text-muted-foreground mt-1 px-4 leading-relaxed">
                    Premium analysis of <strong className="text-slate-700">{studentData?.name}</strong>'s performance.
                  </p>
                </div>
                <Button onClick={generateSummary} className="mt-2 gap-2 border-2 border-border shadow-pop font-bold text-sm">
                  <FileText size={15} /> Generate Report
                </Button>
              </div>
            ) : (
              messages.filter(m => m.role !== 'system').map((msg, idx) => (
                <div key={idx} className={`flex gap-2 sm:gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 mt-1 ${
                    msg.role === 'user' ? 'bg-accent' : 'bg-white shadow-sm'
                  }`}>
                    {msg.role === 'user'
                      ? <User size={13} className="text-white" />
                      : <Bot size={13} className="text-accent" />
                    }
                  </div>
                  <div className={`max-w-[85%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-tr-sm text-sm'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm shadow-sm'
                  }`}>
                    <FormattedMessage content={msg.content} role={msg.role} />
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-2 sm:gap-2.5">
                <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 mt-1 bg-white shadow-sm">
                  <Bot size={13} className="text-accent" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-400 ml-1">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Download CTA after AI response */}
            {lastAIMessage && !isLoading && (
              <div className="flex justify-center pt-2 pb-1">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-full text-xs font-bold border border-accent/20 transition-colors"
                >
                  <Download size={14} />
                  Download PDF Report
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ──────────────────────────── */}
          <div className="px-3 py-2.5 border-t border-slate-100 bg-white shrink-0">
            <form onSubmit={handleSend} className="flex w-full gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 border border-slate-200 rounded-xl h-10 sm:h-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-accent shadow-none bg-slate-50 placeholder:text-slate-400"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-accent hover:bg-accent/90 text-white border border-border shadow-pop-soft shrink-0 disabled:opacity-40"
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
