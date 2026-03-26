"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm transition-colors mb-10"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-neutral-500 text-sm mb-12">
          Last updated: March 26, 2026
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-neutral-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              T3kniQ LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates Employee Zero (&ldquo;the Service&rdquo;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Service. Please read this policy carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-neutral-200 mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account information: email address, display name, and profile settings</li>
              <li>Payment information: processed securely through Stripe (we never store full card details)</li>
              <li>Conversation data: messages you exchange with AI agents</li>
              <li>API keys: third-party service credentials you choose to connect</li>
              <li>Memory data: facts and preferences you share with your AI employees</li>
            </ul>
            <h3 className="text-base font-medium text-neutral-200 mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Usage data: features used, pages visited, and interaction patterns</li>
              <li>Device information: browser type, operating system, and screen resolution</li>
              <li>Log data: IP address, access times, and referring URLs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide, operate, and improve the Service</li>
              <li>Process transactions and manage your subscription</li>
              <li>Personalize your AI agent experience and maintain conversation memory</li>
              <li>Communicate with you about updates, features, and support</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored on Google Cloud Platform (Firebase) with industry-standard encryption at rest and in transit. We implement administrative, technical, and physical safeguards to protect your information. However, no method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. API Keys and Credentials</h2>
            <p>
              When you connect third-party API keys to the Service, they are stored in encrypted Firestore documents accessible only to your account. We use your API keys solely to make API calls on your behalf and never share them with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. AI Conversations and Memory</h2>
            <p>
              Conversations with AI agents are stored to maintain context and provide persistent memory. Your conversation data may be processed by third-party AI providers (e.g., Google Gemini) as part of generating responses. We do not use your conversation data to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">Service providers:</strong> Third-party vendors who assist in operating the Service (e.g., Stripe for payments, Google Cloud for hosting)</li>
              <li><strong className="text-white">AI providers:</strong> To process your conversations and generate AI responses</li>
              <li><strong className="text-white">Legal requirements:</strong> When required by law, subpoena, or legal process</li>
              <li><strong className="text-white">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict data processing</li>
              <li>Data portability (export your data)</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@t3kniq.com" className="text-blue-400 hover:underline">
                privacy@t3kniq.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the Service. Upon account deletion, we will delete or anonymize your data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected data from a minor, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>
              For questions about this Privacy Policy, please contact us at{" "}
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
