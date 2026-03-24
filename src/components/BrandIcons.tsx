"use client";

import React from "react";

/* ─── Each icon is a pure SVG component at native aspect ratio ─── */

export function GmailIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M5.5 8.5h37a3 3 0 013 3v25a3 3 0 01-3 3h-37a3 3 0 01-3-3v-25a3 3 0 013-3z" fill="#F4F4F4"/>
      <path d="M2.5 11.5l21.5 14 21.5-14" stroke="#EA4335" strokeWidth="2" fill="none"/>
      <path d="M2.5 11.5v25a3 3 0 003 3h5V17.5l13.5 9" fill="#4285F4"/>
      <path d="M45.5 11.5v25a3 3 0 01-3 3h-5V17.5l-13.5 9" fill="#34A853"/>
      <path d="M10.5 39.5V17.5l-8-6" fill="#C5221F"/>
      <path d="M37.5 39.5V17.5l8-6" fill="#FBBC05"/>
    </svg>
  );
}

export function CalendarIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="10" width="36" height="32" rx="3" fill="#fff"/>
      <rect x="6" y="10" width="36" height="10" rx="3" fill="#4285F4"/>
      <text x="24" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A73E8">17</text>
      <rect x="14" y="6" width="3" height="8" rx="1.5" fill="#4285F4"/>
      <rect x="31" y="6" width="3" height="8" rx="1.5" fill="#4285F4"/>
    </svg>
  );
}

export function DocsIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M12 4h16l12 12v28a2 2 0 01-2 2H12a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#4285F4"/>
      <path d="M28 4v12h12" fill="#A1C2FA"/>
      <rect x="16" y="24" width="16" height="2" rx="1" fill="#fff"/>
      <rect x="16" y="30" width="12" height="2" rx="1" fill="#fff"/>
      <rect x="16" y="36" width="14" height="2" rx="1" fill="#fff"/>
    </svg>
  );
}

export function SheetsIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M12 4h16l12 12v28a2 2 0 01-2 2H12a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#34A853"/>
      <path d="M28 4v12h12" fill="#8ED1A5"/>
      <rect x="15" y="22" width="18" height="18" rx="1" fill="#fff"/>
      <line x1="24" y1="22" x2="24" y2="40" stroke="#34A853" strokeWidth="1.5"/>
      <line x1="15" y1="28" x2="33" y2="28" stroke="#34A853" strokeWidth="1.5"/>
      <line x1="15" y1="34" x2="33" y2="34" stroke="#34A853" strokeWidth="1.5"/>
    </svg>
  );
}

export function DriveIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M16.5 6h15L42 28H31.5L16.5 6z" fill="#FBBC05"/>
      <path d="M6 28l5.25-9L31.5 28H6z" fill="#4285F4"/>
      <path d="M16.5 6L6 28l10.5 14h15l10.5-14H31.5L16.5 6z" fill="none"/>
      <path d="M16.5 6L6 28h15.75" fill="#34A853"/>
      <path d="M31.5 28l-5.25 14h15.75L31.5 28z" fill="#EA4335"/>
      <path d="M6 28l10.5 14h5.25L11.25 19 6 28z" fill="#4285F4"/>
    </svg>
  );
}

export function MeetIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="12" width="22" height="24" rx="3" fill="#00AC47"/>
      <path d="M28 18l12-6v24l-12-6V18z" fill="#00832D"/>
      <rect x="11" y="19" width="12" height="3" rx="1" fill="#fff"/>
      <rect x="11" y="25" width="12" height="3" rx="1" fill="#fff"/>
    </svg>
  );
}

export function InstagramIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="ig" x1="0" y1="48" x2="48" y2="0">
          <stop offset="0%" stopColor="#FD5"/>
          <stop offset="50%" stopColor="#FF543E"/>
          <stop offset="100%" stopColor="#C837AB"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig)"/>
      <circle cx="24" cy="24" r="9" stroke="#fff" strokeWidth="3" fill="none"/>
      <circle cx="35" cy="13" r="2.5" fill="#fff"/>
    </svg>
  );
}

export function XIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#000"/>
      <path d="M13 12h5.5l5.5 7.5L30.5 12H36L27.5 22 37 36h-5.5l-6-8.2L18 36H12.5l9-10.5L13 12z" fill="#fff"/>
    </svg>
  );
}

export function LinkedInIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#0A66C2"/>
      <path d="M15.5 20v14h-4V20h4zm-2-6.5a2.3 2.3 0 110 4.6 2.3 2.3 0 010-4.6zM19 20h3.8v1.9h.05c.53-1 1.82-2.1 3.75-2.1 4 0 4.75 2.65 4.75 6.1V34h-4v-7.2c0-1.7-.03-3.9-2.38-3.9s-2.72 1.85-2.72 3.78V34H19V20z" fill="#fff"/>
    </svg>
  );
}

export function FacebookIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="2" y="2" width="44" height="44" rx="22" fill="#1877F2"/>
      <path d="M33 24.5h-5V21c0-1.4.6-2 2.2-2H33v-5h-4c-4.5 0-6.5 2.7-6.5 6.5v4H19v5h3.5V42h5.5V29.5h4.2l.8-5z" fill="#fff"/>
    </svg>
  );
}

export function TikTokIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#010101"/>
      <path d="M33.3 14.7A6.6 6.6 0 0130 10h-5v20.5a4.5 4.5 0 11-3.2-4.3V21a9.5 9.5 0 108.2 9.5V19.8A11.5 11.5 0 0038 22v-5a6.6 6.6 0 01-4.7-2.3z" fill="#fff"/>
      <path d="M33.3 14.7A6.6 6.6 0 0130 10h-2v20.5a4.5 4.5 0 01-7.8 3 4.5 4.5 0 006.8-3.9V10h2" fill="#25F4EE"/>
      <path d="M35 17.5V22a11.5 11.5 0 01-8-3.2v10.7a9.5 9.5 0 01-6.2 8.9 9.5 9.5 0 003.2.6 9.5 9.5 0 009.5-9.5V19.8A11.5 11.5 0 0038 22v-3.5a6.5 6.5 0 01-3-1z" fill="#FE2C55"/>
    </svg>
  );
}

export function YouTubeIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="2" y="8" width="44" height="32" rx="8" fill="#FF0000"/>
      <path d="M20 16l12 8-12 8V16z" fill="#fff"/>
    </svg>
  );
}

export function SlackIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M14 30a3 3 0 01-3 3 3 3 0 010-6h3v3zm1.5 0a3 3 0 016 0v7.5a3 3 0 01-6 0V30z" fill="#E01E5A"/>
      <path d="M18 14a3 3 0 01-3-3 3 3 0 016 0v3h-3zm0 1.5a3 3 0 010 6h-7.5a3 3 0 010-6H18z" fill="#36C5F0"/>
      <path d="M34 18a3 3 0 013-3 3 3 0 010 6h-3v-3zm-1.5 0a3 3 0 01-6 0v-7.5a3 3 0 016 0V18z" fill="#2EB67D"/>
      <path d="M30 34a3 3 0 013 3 3 3 0 01-6 0v-3h3zm0-1.5a3 3 0 010-6h7.5a3 3 0 010 6H30z" fill="#ECB22E"/>
    </svg>
  );
}

export function NotionIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="4" y="4" width="40" height="40" rx="8" fill="#fff"/>
      <path d="M14 12h12l8 3v21l-8 2H14V12z" fill="#fff" stroke="#000" strokeWidth="1.5"/>
      <path d="M18 16v20M22 14l-4 2M30 15v19" stroke="#000" strokeWidth="1.5"/>
    </svg>
  );
}

export function ZapierIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#FF4A00"/>
      <path d="M32 14H20l-4 10 4 10h12l4-10-4-10z" fill="none" stroke="#fff" strokeWidth="2.5"/>
      <path d="M20 14l8 10-8 10M28 14l-8 10 8 10" stroke="#fff" strokeWidth="2"/>
    </svg>
  );
}

export function StripeIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#635BFF"/>
      <path d="M22 18c0-1.1.9-1.5 2.3-1.5 2 0 4.7.6 6.7 1.8V12c-2.2-.9-4.4-1.3-6.7-1.3-5.5 0-9.1 2.9-9.1 7.7 0 7.5 10.3 6.3 10.3 9.5 0 1.3-1.1 1.7-2.7 1.7-2.3 0-5.3-1-7.6-2.3v6.3c2.6 1.1 5.2 1.6 7.6 1.6 5.6 0 9.5-2.8 9.5-7.7-.1-8.1-10.3-6.7-10.3-9.5z" fill="#fff"/>
    </svg>
  );
}

export function HubSpotIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" fill="#FF7A59"/>
      <circle cx="30" cy="18" r="3" fill="#fff"/>
      <path d="M30 21v6.5a4.5 4.5 0 11-4-4.5" stroke="#fff" strokeWidth="2.5" fill="none"/>
      <circle cx="21" cy="28" r="4.5" stroke="#fff" strokeWidth="2.5" fill="none"/>
      <rect x="17" y="12" width="2.5" height="8" rx="1" fill="#fff"/>
    </svg>
  );
}
