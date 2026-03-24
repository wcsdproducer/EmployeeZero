"use client";

import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/hooks/useAuth";
import {
  GmailIcon, CalendarIcon, DocsIcon, SheetsIcon, DriveIcon, MeetIcon,
  InstagramIcon, XIcon as XBrandIcon, LinkedInIcon, FacebookIcon, TikTokIcon, YouTubeIcon,
  SlackIcon, NotionIcon, ZapierIcon, StripeIcon, HubSpotIcon,
} from "@/components/BrandIcons";
import {
  INTEGRATIONS,
  saveIntegrationKey,
  getAllIntegrationKeys,
  deleteIntegrationKey,
  validateKeyFormat,
  type IntegrationConfig,
  type IntegrationRecord,
} from "@/lib/keys";
import {
  ChevronDown,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";

/* ─── Icon map ─── */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  gmail: GmailIcon,
  calendar: CalendarIcon,
  docs: DocsIcon,
  sheets: SheetsIcon,
  drive: DriveIcon,
  meet: MeetIcon,
  instagram: InstagramIcon,
  x_twitter: XBrandIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  slack: SlackIcon,
  notion: NotionIcon,
  zapier: ZapierIcon,
  stripe: StripeIcon,
  hubspot: HubSpotIcon,
};

const SECTION_META = [
  { key: "google" as const, title: "Google Workspace", description: "Connect your Google apps to let Zero manage email, calendar, docs and more." },
  { key: "social" as const, title: "Social Media", description: "Give Zero access to post, engage, and track analytics across your socials." },
  { key: "tools" as const, title: "More Tools", description: "Wire up your favorite productivity and business tools." },
];

/* ─── Integration card ─── */
function IntegrationCard({
  config,
  record,
  onConnect,
  onDisconnect,
}: {
  config: IntegrationConfig;
  record: IntegrationRecord | null;
  onConnect: (id: string, key: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const BrandIcon = ICON_MAP[config.id];
  const isConnected = record?.status === "connected";

  const handleConnect = async () => {
    setError(null);
    if (!validateKeyFormat(config.id, keyInput)) {
      setError("Invalid key format. Please double-check and try again.");
      return;
    }
    setSaving(true);
    try {
      await onConnect(config.id, keyInput.trim());
      setKeyInput("");
      setShowKey(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect(config.id);
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {BrandIcon && <BrandIcon size={40} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-bold text-gray-900">{config.name}</h3>
            {isConnected ? (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                <Check size={10} />
                Connected
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                Not Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">
            {config.description}
          </p>

          {isConnected ? (
            /* Connected state */
            <div className="flex items-center gap-3">
              <div className="flex-1 h-9 px-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center text-xs text-gray-400 font-mono">
                ••••••••••••••••
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="h-9 px-4 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-red-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Disconnect
              </button>
            </div>
          ) : (
            /* Input state */
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => { setKeyInput(e.target.value); setError(null); }}
                    placeholder={config.placeholder}
                    className="w-full h-9 pl-3 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono placeholder:font-sans placeholder:text-gray-300 text-gray-700 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!keyInput.trim() || saving}
                  className="h-9 px-5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Connect
                </button>
              </div>
              {config.helpUrl && (
                <a
                  href={config.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
                >
                  Where do I find this?
                  <ExternalLink size={10} />
                </a>
              )}
              {error && (
                <p className="text-[11px] text-red-500 font-medium">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Collapsible section ─── */
function Section({
  title,
  description,
  children,
  connectedCount,
  totalCount,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  connectedCount: number;
  totalCount: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {connectedCount}/{totalCount}
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <p className="text-xs text-gray-400 -mt-1">{description}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {children}
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Main page ─── */
export default function SetupPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record<string, IntegrationRecord>>({});
  const [loading, setLoading] = useState(true);

  // Load existing keys
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getAllIntegrationKeys(user.uid)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleConnect = useCallback(
    async (integrationId: string, key: string) => {
      if (!user) return;
      await saveIntegrationKey(user.uid, integrationId, key);
      const updated = await getAllIntegrationKeys(user.uid);
      setRecords(updated);
    },
    [user]
  );

  const handleDisconnect = useCallback(
    async (integrationId: string) => {
      if (!user) return;
      await deleteIntegrationKey(user.uid, integrationId);
      const updated = await getAllIntegrationKeys(user.uid);
      setRecords(updated);
    },
    [user]
  );

  const totalConnected = Object.values(records).filter(
    (r) => r.status === "connected"
  ).length;

  const getByCategory = (cat: IntegrationConfig["category"]) =>
    INTEGRATIONS.filter((i) => i.category === cat);

  const countConnected = (cat: IntegrationConfig["category"]) =>
    getByCategory(cat).filter((i) => records[i.id]?.status === "connected").length;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <div className="max-w-4xl mx-auto w-full p-6 md:p-12 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-8 mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Setup
            </h1>
            <p className="text-gray-500 mt-2">
              Connect your accounts — Employee Zero handles the rest.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-100">
              <Shield size={14} />
              BYOK — Your Keys, Your Control
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">
              {totalConnected} of {INTEGRATIONS.length} integrations connected
            </span>
            <span className="text-xs font-bold text-gray-900">
              {Math.round((totalConnected / INTEGRATIONS.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${(totalConnected / INTEGRATIONS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : !user ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">Sign in to manage your integrations.</p>
            <a
              href="/login"
              className="inline-flex h-10 px-6 items-center text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Sign In
            </a>
          </div>
        ) : (
          <div className="space-y-10">
            {SECTION_META.map((section) => (
              <Section
                key={section.key}
                title={section.title}
                description={section.description}
                connectedCount={countConnected(section.key)}
                totalCount={getByCategory(section.key).length}
              >
                {getByCategory(section.key).map((config) => (
                  <IntegrationCard
                    key={config.id}
                    config={config}
                    record={records[config.id] || null}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                  />
                ))}
              </Section>
            ))}

            {/* Security notice */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-start gap-4">
              <Shield size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-1">
                  Your keys are yours
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  All API keys are stored securely in your private Firestore document
                  and are never shared, logged, or used outside of your Employee Zero
                  instance. You can disconnect any integration at any time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
