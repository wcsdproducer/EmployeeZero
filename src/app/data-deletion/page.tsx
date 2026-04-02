"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm transition-colors mb-10"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">Data Deletion</h1>
        <p className="text-neutral-500 text-sm mb-12">
          Last updated: April 2, 2026
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-neutral-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How to Request Data Deletion</h2>
            <p>
              At Employee Zero, operated by T3kniQ LLC, we respect your right to control your personal data. 
              If you would like to request the deletion of your data associated with your Employee Zero account, 
              you can do so through any of the following methods:
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Option 1: Delete Your Account</h2>
            <p>
              You can delete your account and all associated data directly from your Employee Zero dashboard:
            </p>
            <ol className="list-decimal pl-6 mt-3 space-y-2">
              <li>Log in to your Employee Zero account at <a href="https://employeezero.app/login" className="text-blue-400 hover:underline">employeezero.app/login</a></li>
              <li>Navigate to <strong className="text-white">Settings</strong></li>
              <li>Scroll to <strong className="text-white">Account Management</strong></li>
              <li>Click <strong className="text-white">&ldquo;Delete My Account&rdquo;</strong></li>
              <li>Confirm the deletion when prompted</li>
            </ol>
            <p className="mt-3">
              This will permanently delete your account, conversation history, AI memory data, connected integrations, and all other personal data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Option 2: Email Request</h2>
            <p>
              Send an email to{" "}
              <a href="mailto:privacy@t3kniq.com" className="text-blue-400 hover:underline">
                privacy@t3kniq.com
              </a>{" "}
              with the subject line <strong className="text-white">&ldquo;Data Deletion Request&rdquo;</strong> and include:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Your full name</li>
              <li>The email address associated with your Employee Zero account</li>
              <li>A description of the data you would like deleted (or &ldquo;all data&rdquo;)</li>
            </ul>
            <p className="mt-3">
              We will process your request within 30 days and send a confirmation email once the deletion is complete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Facebook Login Data</h2>
            <p>
              If you signed up using Facebook Login, we receive your public profile information (name and email address). 
              When you request data deletion, we will delete all data obtained through Facebook Login, including:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Your Facebook-linked profile information</li>
              <li>Any conversation or memory data associated with your account</li>
              <li>All connected third-party credentials</li>
              <li>Usage analytics and activity logs</li>
            </ul>
            <p className="mt-3">
              You can also remove Employee Zero&apos;s access to your Facebook account directly from your{" "}
              <a href="https://www.facebook.com/settings?tab=applications" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                Facebook App Settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What Data Is Deleted</h2>
            <p>Upon a successful deletion request, we will remove:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Account profile and authentication data</li>
              <li>All AI conversation history and memory</li>
              <li>Connected API keys and third-party credentials</li>
              <li>Usage analytics and interaction logs</li>
              <li>Payment metadata (full payment records managed by Stripe will be handled per Stripe&apos;s retention policy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data Retention Exceptions</h2>
            <p>
              Certain data may be retained for a limited period as required by law, including financial transaction records 
              for tax and accounting purposes. Anonymized, aggregated data that cannot be linked back to you may also be retained 
              for analytics and service improvement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              If you have questions about data deletion, please contact us at{" "}
              <a href="mailto:privacy@t3kniq.com" className="text-blue-400 hover:underline">
                privacy@t3kniq.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">
            T3kniQ LLC • Employee Zero Platform
          </p>
        </div>
      </div>
    </div>
  );
}
