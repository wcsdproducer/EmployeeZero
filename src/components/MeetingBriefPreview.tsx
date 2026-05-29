"use client";

import { Calendar, Clock, Users, Target, CheckSquare, MessageSquare, AlertCircle } from "lucide-react";

export interface MeetingBriefData {
  meetingTitle: string;
  time: string;
  attendees: string[];
  overview: string;
  talkingPoints: string[];
  actionItems?: string[];
  questionsToAsk?: string[];
}

interface MeetingBriefPreviewProps {
  brief: MeetingBriefData;
}

export function MeetingBriefPreview({ brief }: MeetingBriefPreviewProps) {
  return (
    <div className="bg-white text-black p-6 rounded-xl border border-neutral-200 shadow-sm w-full max-w-[600px] font-sans mx-auto">
      <div className="flex items-start justify-between border-b border-neutral-200 pb-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2 leading-tight">{brief.meetingTitle}</h2>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} />
              <span>{brief.time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={16} />
              <span>30 min</span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
          <Users size={16} />
          {brief.attendees.length}
        </div>
      </div>

      <div className="space-y-6 text-sm">
        <section>
          <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Target size={16} className="text-blue-500" />
            Meeting Overview
          </h3>
          <p className="text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-100">
            {brief.overview}
          </p>
        </section>

        {brief.attendees.length > 0 && (
          <section>
            <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <Users size={16} className="text-purple-500" />
              Attendees
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {brief.attendees.map((attendee, idx) => (
                <li key={idx} className="flex items-center gap-2 text-neutral-700 bg-neutral-50 p-2 rounded-md border border-neutral-100">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs uppercase">
                    {attendee.charAt(0)}
                  </div>
                  <span className="truncate">{attendee}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-green-500" />
            Talking Points
          </h3>
          <ul className="space-y-2">
            {brief.talkingPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-neutral-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {brief.questionsToAsk && brief.questionsToAsk.length > 0 && (
          <section>
            <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Questions to Ask
            </h3>
            <ul className="space-y-2">
              {brief.questionsToAsk.map((q, idx) => (
                <li key={idx} className="flex items-start gap-2 text-neutral-700">
                  <span className="text-amber-500 font-bold shrink-0">?</span>
                  <span className="leading-snug italic">{q}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {brief.actionItems && brief.actionItems.length > 0 && (
          <section>
            <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <CheckSquare size={16} className="text-red-500" />
              Preparation / Action Items
            </h3>
            <ul className="space-y-2">
              {brief.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-neutral-700">
                  <div className="w-4 h-4 border border-neutral-300 rounded mt-0.5 shrink-0" />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
