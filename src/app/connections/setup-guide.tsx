"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SetupStep {
  step: number;
  text: string;
  link?: string;
  linkText?: string;
}

interface SetupGuideProps {
  platformName: string;
  steps: SetupStep[];
  className?: string;
}

export function SetupGuide({ platformName, steps, className }: SetupGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("mt-3", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors font-medium"
      >
        <ChevronDown
          size={12}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
        How to get your {platformName} API key
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ol className="mt-3 space-y-2 pl-1">
              {steps.map((s) => (
                <li key={s.step} className="flex gap-3 text-xs text-neutral-400">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-neutral-500">
                    {s.step}
                  </span>
                  <span className="pt-0.5 leading-relaxed">
                    {s.text}
                    {s.link && (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 ml-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {s.linkText || "Open"}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Pre-built platform guides ─── */

export const BRAIN_GUIDES: Record<string, SetupStep[]> = {
  gemini: [
    { step: 1, text: "Go to Google AI Studio", link: "https://aistudio.google.com/apikey", linkText: "aistudio.google.com" },
    { step: 2, text: "Click \"Create API key\" (sign in with your Google account if prompted)" },
    { step: 3, text: "Copy the generated key and paste it above" },
    { step: 4, text: "You only pay for what you use — billing is on your Google Cloud account" },
  ],
  openai: [
    { step: 1, text: "Go to the OpenAI dashboard", link: "https://platform.openai.com/api-keys", linkText: "platform.openai.com" },
    { step: 2, text: "Click \"+ Create new secret key\", give it a name" },
    { step: 3, text: "Copy the key immediately (it won't be shown again)" },
    { step: 4, text: "Ensure you have billing set up in your OpenAI account" },
  ],
  claude: [
    { step: 1, text: "Go to the Anthropic Console", link: "https://console.anthropic.com/settings/keys", linkText: "console.anthropic.com" },
    { step: 2, text: "Click \"Create Key\", give it a name" },
    { step: 3, text: "Copy the key and paste it above" },
    { step: 4, text: "Billing is handled through your Anthropic account" },
  ],
};

export const SOCIAL_GUIDES: Record<string, SetupStep[]> = {
  twitter: [
    { step: 1, text: "Go to the Twitter Developer Portal", link: "https://developer.twitter.com/en/portal/dashboard", linkText: "developer.twitter.com" },
    { step: 2, text: "Create a project and app (Free tier available)" },
    { step: 3, text: "Generate your Bearer Token from the app settings" },
    { step: 4, text: "Copy both the API Key and API Secret" },
  ],
  instagram: [
    { step: 1, text: "Go to Meta for Developers", link: "https://developers.facebook.com/apps/", linkText: "developers.facebook.com" },
    { step: 2, text: "Create an app → select \"Business\" type" },
    { step: 3, text: "Add the Instagram Graph API product" },
    { step: 4, text: "Generate a long-lived access token from the API Explorer" },
  ],
  tiktok: [
    { step: 1, text: "Go to TikTok for Developers", link: "https://developers.tiktok.com/", linkText: "developers.tiktok.com" },
    { step: 2, text: "Register as a developer and create an app" },
    { step: 3, text: "Configure the Content Posting API scope" },
    { step: 4, text: "Copy your Client Key from the app settings" },
  ],
  linkedin: [
    { step: 1, text: "Go to LinkedIn Developer Portal", link: "https://developer.linkedin.com/", linkText: "developer.linkedin.com" },
    { step: 2, text: "Create an app linked to your LinkedIn Company Page" },
    { step: 3, text: "Request the \"Share on LinkedIn\" product" },
    { step: 4, text: "Generate an OAuth 2.0 Access Token" },
  ],
  facebook: [
    { step: 1, text: "Go to Meta for Developers", link: "https://developers.facebook.com/apps/", linkText: "developers.facebook.com" },
    { step: 2, text: "Create an app → select \"Business\" type" },
    { step: 3, text: "Add Facebook Pages API product" },
    { step: 4, text: "Generate a Page Access Token with required permissions" },
  ],
};

export const GOOGLE_SUITE_GUIDES: Record<string, SetupStep[]> = {
  youtube: [
    { step: 1, text: "Go to Google Cloud Console", link: "https://console.cloud.google.com/apis/credentials", linkText: "cloud.google.com" },
    { step: 2, text: "Create or select a project" },
    { step: 3, text: "Enable the YouTube Data API v3" },
    { step: 4, text: "Create an API key under Credentials" },
  ],
  gmail: [
    { step: 1, text: "Click \"Connect with Google\" above — you'll be redirected to Google's consent screen" },
    { step: 2, text: "Sign in with the Google account you want your agents to use for email" },
    { step: 3, text: "If you see \"This app hasn't been verified\", click Advanced → Continue (this is normal for testing)" },
    { step: 4, text: "Grant access to read and send emails — your agents can now manage your inbox" },
  ],
  calendar: [
    { step: 1, text: "Click \"Connect with Google\" above — you'll be redirected to Google's consent screen" },
    { step: 2, text: "Sign in with the Google account whose calendar you want to manage" },
    { step: 3, text: "Grant access to view and edit calendar events" },
    { step: 4, text: "Your agents can now schedule meetings, check availability, and send invites" },
  ],
  drive: [
    { step: 1, text: "Click \"Connect with Google\" above — you'll be redirected to Google's consent screen" },
    { step: 2, text: "Sign in with the Google account whose Drive you want to access" },
    { step: 3, text: "Grant access to view and manage files" },
    { step: 4, text: "Your agents can now upload, organize, and share files in your Drive" },
  ],
  sheets: [
    { step: 1, text: "Click \"Connect with Google\" above — you'll be redirected to Google's consent screen" },
    { step: 2, text: "Sign in with the Google account that owns the spreadsheets" },
    { step: 3, text: "Grant access to read and write spreadsheet data" },
    { step: 4, text: "Your agents can now read, update, and create spreadsheets" },
  ],
};
