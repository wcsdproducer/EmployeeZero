"use client";

// Official brand SVG icons for connected services
// Each icon uses the service's official brand colors

export function GmailIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 6L12 13L22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6Z" fill="#D14836"/>
      <path d="M22 6L12 13L2 6C2 4.9 2.9 4 4 4H20C21.1 4 22 4.9 22 6Z" fill="#EA4335"/>
      <path d="M12 13L2 6V18L8 12.5L12 13Z" fill="#C5221F"/>
      <path d="M12 13L22 6V18L16 12.5L12 13Z" fill="#C5221F"/>
      <path d="M2 6L12 13L8 12.5L2 18V6Z" fill="#F5F5F5" opacity="0.2"/>
    </svg>
  );
}

export function CalendarIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="18" rx="2" fill="#4285F4"/>
      <rect x="2" y="4" width="20" height="5" rx="2" fill="#1A73E8"/>
      <rect x="5" y="11" width="3" height="3" rx="0.5" fill="white"/>
      <rect x="10.5" y="11" width="3" height="3" rx="0.5" fill="white"/>
      <rect x="16" y="11" width="3" height="3" rx="0.5" fill="white"/>
      <rect x="5" y="16" width="3" height="3" rx="0.5" fill="white"/>
      <rect x="10.5" y="16" width="3" height="3" rx="0.5" fill="white"/>
      <rect x="7" y="2" width="2" height="4" rx="1" fill="#1A73E8"/>
      <rect x="15" y="2" width="2" height="4" rx="1" fill="#1A73E8"/>
    </svg>
  );
}

export function DriveIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8.5 2.5L1.5 14.5H7.5L14.5 2.5H8.5Z" fill="#0066DA"/>
      <path d="M14.5 2.5L7.5 14.5H1.5L8.5 2.5H14.5Z" fill="#00AC47"/>
      <path d="M14.5 2.5L21.5 14.5H15.5L8.5 2.5H14.5Z" fill="#00AC47"/>
      <path d="M21.5 14.5H7.5L4.5 20.5H18.5L21.5 14.5Z" fill="#FFBA00"/>
      <path d="M14.5 2.5L21.5 14.5L18.5 20.5L11.5 8.5L14.5 2.5Z" fill="#EA4335"/>
      <path d="M7.5 14.5L4.5 20.5L1.5 14.5H7.5Z" fill="#0066DA"/>
    </svg>
  );
}

export function SheetsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7.5L14.5 2Z" fill="#0F9D58"/>
      <path d="M14.5 2V7.5H20L14.5 2Z" fill="#87CEAC"/>
      <rect x="7" y="10" width="10" height="9" rx="0.5" fill="white" opacity="0.9"/>
      <line x1="7" y1="13" x2="17" y2="13" stroke="#0F9D58" strokeWidth="0.5"/>
      <line x1="7" y1="16" x2="17" y2="16" stroke="#0F9D58" strokeWidth="0.5"/>
      <line x1="11" y1="10" x2="11" y2="19" stroke="#0F9D58" strokeWidth="0.5"/>
    </svg>
  );
}

export function DocsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7.5L14.5 2Z" fill="#4285F4"/>
      <path d="M14.5 2V7.5H20L14.5 2Z" fill="#A1C2FA"/>
      <rect x="7" y="11" width="8" height="1" rx="0.5" fill="white" opacity="0.9"/>
      <rect x="7" y="13.5" width="10" height="1" rx="0.5" fill="white" opacity="0.9"/>
      <rect x="7" y="16" width="6" height="1" rx="0.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

export function SlidesIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7.5L14.5 2Z" fill="#FBBC04"/>
      <path d="M14.5 2V7.5H20L14.5 2Z" fill="#FDE293"/>
      <rect x="7" y="10" width="10" height="8" rx="0.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

export function FormsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7.5L14.5 2Z" fill="#673AB7"/>
      <path d="M14.5 2V7.5H20L14.5 2Z" fill="#B39DDB"/>
      <circle cx="8.5" cy="12" r="1" fill="white" opacity="0.9"/>
      <rect x="11" y="11.5" width="6" height="1" rx="0.5" fill="white" opacity="0.9"/>
      <circle cx="8.5" cy="15" r="1" fill="white" opacity="0.9"/>
      <rect x="11" y="14.5" width="6" height="1" rx="0.5" fill="white" opacity="0.9"/>
      <circle cx="8.5" cy="18" r="1" fill="white" opacity="0.9"/>
      <rect x="11" y="17.5" width="6" height="1" rx="0.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

export function TasksIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#4285F4"/>
      <path d="M10 14.5L7.5 12L6.5 13L10 16.5L17.5 9L16.5 8L10 14.5Z" fill="white"/>
    </svg>
  );
}

export function YouTubeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.54 6.42C22.4212 5.94541 22.1793 5.51057 21.8387 5.15941C21.498 4.80824 21.0708 4.55318 20.6 4.42C18.88 4 12 4 12 4C12 4 5.12 4 3.4 4.46C2.92925 4.59318 2.50198 4.84824 2.16135 5.19941C1.82072 5.55057 1.57879 5.98541 1.46 6.46C1.14521 8.20556 0.991235 9.97631 1 11.75C0.988687 13.537 1.14266 15.3213 1.46 17.08C1.59096 17.5398 1.83831 17.9581 2.17814 18.2945C2.51798 18.6308 2.93882 18.8738 3.4 19C5.12 19.46 12 19.46 12 19.46C12 19.46 18.88 19.46 20.6 19C21.0708 18.8668 21.498 18.6118 21.8387 18.2606C22.1793 17.9094 22.4212 17.4746 22.54 17C22.8524 15.2676 23.0063 13.5103 23 11.75C23.0113 9.96295 22.8574 8.1787 22.54 6.42Z" fill="#FF0000"/>
      <path d="M9.75 15.27L15.5 11.75L9.75 8.23V15.27Z" fill="white"/>
    </svg>
  );
}

export function AnalyticsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#F9AB00"/>
      <rect x="5" y="14" width="3" height="4" rx="0.5" fill="white"/>
      <rect x="10.5" y="10" width="3" height="8" rx="0.5" fill="white"/>
      <rect x="16" y="6" width="3" height="12" rx="0.5" fill="white"/>
    </svg>
  );
}

export function BusinessIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#4285F4"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  );
}

export function ContactsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#1A73E8"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
      <path d="M7 18C7 15.24 9.24 14 12 14C14.76 14 17 15.24 17 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function LinkedInIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#0A66C2"/>
      <path d="M7.5 10V17H9.5V10H7.5Z" fill="white"/>
      <circle cx="8.5" cy="7.5" r="1.2" fill="white"/>
      <path d="M11 10V17H13V13.5C13 12.5 13.5 12 14.5 12C15.5 12 15.5 12.5 15.5 13.5V17H17.5V13C17.5 11 16.5 10 14.5 10C13.5 10 12.5 10.5 12 11V10H11Z" fill="white"/>
    </svg>
  );
}

export function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#000000"/>
      <path d="M16.5 5H18.5L13.5 11L19 19H14.5L11 14L7.5 19H5.5L10.5 13L5 5H9.5L13 10L16.5 5Z" fill="white" stroke="white" strokeWidth="0.3"/>
    </svg>
  );
}

export function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2">
          <stop offset="0%" stopColor="#FEDA75"/>
          <stop offset="20%" stopColor="#FA7E1E"/>
          <stop offset="40%" stopColor="#D62976"/>
          <stop offset="60%" stopColor="#962FBF"/>
          <stop offset="100%" stopColor="#4F5BD5"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
    </svg>
  );
}

export function FacebookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#1877F2"/>
      <path d="M16 8H14C13 8 12.5 8.5 12.5 9.5V11H16L15.5 14H12.5V22H10V14H7.5V11H10V9C10 6.8 11.3 5.5 13.5 5.5C14.5 5.5 15.5 5.7 15.5 5.7V8H16Z" fill="white"/>
    </svg>
  );
}

export function TikTokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#000000"/>
      <path d="M16 8.5C16 8.5 17 9 18 9V7C17 7 16 6 16 5H14V15C14 16.1 13.1 17 12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13V11C9.8 11 8 12.8 8 15C8 17.2 9.8 19 12 19C14.2 19 16 17.2 16 15V8.5Z" fill="white"/>
      <path d="M16 8.5C16 8.5 17 9 18 9V7C17 7 16 6 16 5H14V15C14 16.1 13.1 17 12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13V11C9.8 11 8 12.8 8 15C8 17.2 9.8 19 12 19C14.2 19 16 17.2 16 15V8.5Z" fill="#25F4EE" opacity="0.4" transform="translate(-0.5, -0.5)"/>
      <path d="M16 8.5C16 8.5 17 9 18 9V7C17 7 16 6 16 5H14V15C14 16.1 13.1 17 12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13V11C9.8 11 8 12.8 8 15C8 17.2 9.8 19 12 19C14.2 19 16 17.2 16 15V8.5Z" fill="#FE2C55" opacity="0.4" transform="translate(0.5, 0.5)"/>
    </svg>
  );
}

// Map of service keys to their icon components
export const SERVICE_ICONS: Record<string, { icon: React.ComponentType<{ size?: number }>, label: string, url: string }> = {
  gmail: { icon: GmailIcon, label: "Gmail", url: "https://mail.google.com" },
  calendar: { icon: CalendarIcon, label: "Calendar", url: "https://calendar.google.com" },
  drive: { icon: DriveIcon, label: "Drive", url: "https://drive.google.com" },
  sheets: { icon: SheetsIcon, label: "Sheets", url: "https://sheets.google.com" },
  docs: { icon: DocsIcon, label: "Docs", url: "https://docs.google.com" },
  slides: { icon: SlidesIcon, label: "Slides", url: "https://slides.google.com" },
  forms: { icon: FormsIcon, label: "Forms", url: "https://forms.google.com" },
  tasks: { icon: TasksIcon, label: "Tasks", url: "https://tasks.google.com" },
  youtube: { icon: YouTubeIcon, label: "YouTube", url: "https://studio.youtube.com" },
  analytics: { icon: AnalyticsIcon, label: "Analytics", url: "https://analytics.google.com" },
  business: { icon: BusinessIcon, label: "Business", url: "https://business.google.com" },
  contacts: { icon: ContactsIcon, label: "Contacts", url: "https://contacts.google.com" },
  linkedin: { icon: LinkedInIcon, label: "LinkedIn", url: "https://www.linkedin.com" },
  twitter: { icon: XIcon, label: "X", url: "https://x.com" },
  instagram: { icon: InstagramIcon, label: "Instagram", url: "https://www.instagram.com" },
  facebook: { icon: FacebookIcon, label: "Facebook", url: "https://business.facebook.com" },
  tiktok: { icon: TikTokIcon, label: "TikTok", url: "https://www.tiktok.com" },
};
