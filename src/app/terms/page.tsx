"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-neutral-500 text-sm mb-12">
          Last updated: March 26, 2026
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-neutral-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Employee Zero (&ldquo;the Service&rdquo;), operated by T3kniQ LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              Employee Zero is an AI-powered digital employee platform that provides autonomous AI agents capable of performing tasks, generating content, and assisting with business operations. The Service is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Subscriptions and Payments</h2>
            <p>
              Certain features of the Service require a paid subscription. By subscribing, you agree to pay the fees associated with your selected plan. Subscriptions auto-renew monthly unless canceled. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with 30 days&apos; notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. User Responsibilities</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose or to violate any local, state, national, or international laws or regulations</li>
              <li>Attempt to gain unauthorized access to other accounts, systems, networks, or data</li>
              <li>Use the Service to generate harmful, abusive, threatening, harassing, defamatory, or discriminatory content</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
              <li>Resell or redistribute the Service without our written consent</li>
              <li>Use the Service in a way that could damage, disable, or impair the platform</li>
              <li>Use AI agents to conduct phishing, social engineering, fraud, or any form of deception</li>
              <li>Deploy AI agents to spam, scrape, or overwhelm third-party platforms or services</li>
              <li>Use the Service to create or distribute malware, viruses, or other harmful software</li>
              <li>Use AI agents to stalk, surveil, doxx, or invade the privacy of any individual</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Prohibited Activities and Malicious Use</h2>
            <p>
              You are strictly prohibited from using the Service, directly or indirectly, for any malicious, fraudulent, or illegal purpose. This includes, but is not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">Fraudulent schemes:</strong> Using AI agents to conduct financial fraud, identity theft, impersonation, or deceptive business practices</li>
              <li><strong className="text-white">Illegal content:</strong> Generating, storing, or distributing content that is illegal under applicable law, including but not limited to content involving exploitation, terrorism, or incitement of violence</li>
              <li><strong className="text-white">Unauthorized access:</strong> Using AI agents or the Service to access, probe, or attack systems, networks, or accounts you do not own or have explicit permission to access</li>
              <li><strong className="text-white">Data harvesting:</strong> Using the Service to scrape, collect, or harvest personal data or proprietary information without proper authorization</li>
              <li><strong className="text-white">Intellectual property infringement:</strong> Using AI agents to generate content that infringes upon copyrights, trademarks, patents, or other intellectual property rights of third parties</li>
              <li><strong className="text-white">Circumvention:</strong> Using the Service to bypass, defeat, or circumvent security measures, rate limits, access controls, or content moderation systems on any platform</li>
            </ul>
            <p className="mt-3">
              We reserve the right to immediately suspend or terminate your account, without notice or refund, upon detection or reasonable suspicion of any prohibited activity. We may also report such activity to relevant law enforcement authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Platform Compliance</h2>
            <p>
              The Service may interface with or connect to third-party platforms, APIs, and services (including but not limited to Google Workspace, social media platforms, messaging services, payment processors, and AI providers). By using the Service with any third-party platform, you agree to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Comply with all terms of service, acceptable use policies, and community guidelines of every third-party platform accessed through the Service</li>
              <li>Not use AI agents to violate rate limits, automation policies, or anti-bot measures of any third-party platform</li>
              <li>Not use the Service to create fake accounts, generate spam, or engage in inauthentic behavior on any connected platform</li>
              <li>Not use AI agents to manipulate metrics, reviews, rankings, or engagement on any third-party platform</li>
              <li>Ensure that all automated actions performed through connected platforms comply with those platforms&apos; policies on automation and API usage</li>
              <li>Accept sole responsibility for any consequences, including bans, fines, or legal action, resulting from violations of third-party platform terms</li>
            </ul>
            <p className="mt-3">
              T3kniQ LLC is not responsible for any damages, account suspensions, or penalties you may incur on third-party platforms as a result of your use of the Service. You acknowledge that third-party platforms may change their terms at any time, and it is your responsibility to stay informed of such changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. API Keys and Connected Services</h2>
            <p>
              You may connect third-party API keys (e.g., Google Gemini) to the Service. You are solely responsible for your use of third-party services and any associated costs. We do not store or share your API keys beyond what is necessary to provide the Service. You represent that you have the right to use any API keys you provide and that your usage complies with the respective provider&apos;s terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless T3kniQ LLC, its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including third-party platform terms of service; (d) any content generated through your use of AI agents; or (e) any malicious, fraudulent, or illegal activity conducted through your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Security Measures</h2>
            <p>
              We take the security of your data seriously and implement the following measures to protect the Service and your information:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">Encryption in transit:</strong> All data transmitted between your device and our servers is encrypted using TLS/SSL (HTTPS)</li>
              <li><strong className="text-white">Encryption at rest:</strong> Data stored in our databases is encrypted using Google Cloud&apos;s default encryption (AES-256)</li>
              <li><strong className="text-white">Authentication:</strong> User accounts are secured via Firebase Authentication with support for email/password and OAuth providers (Google). Passwords are never stored in plaintext</li>
              <li><strong className="text-white">Access controls:</strong> Firestore security rules enforce strict per-user data isolation — users can only read and write their own data</li>
              <li><strong className="text-white">API key isolation:</strong> Third-party API keys you provide are stored in encrypted, user-scoped Firestore documents and are never shared across accounts</li>
              <li><strong className="text-white">Payment security:</strong> All payment processing is handled by Stripe, a PCI DSS Level 1 certified payment processor. We never store credit card numbers on our servers</li>
              <li><strong className="text-white">Infrastructure:</strong> The Service is hosted on Google Cloud Platform, which provides enterprise-grade physical security, DDoS protection, and network monitoring</li>
              <li><strong className="text-white">Secure development:</strong> We follow secure coding practices including input validation, output sanitization, and regular dependency updates</li>
            </ul>
            <p className="mt-3">
              While we implement these measures in good faith, no security system is impenetrable. We continuously monitor and improve our security posture as threats evolve.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Risk Acknowledgment and Anti-Hacking</h2>
            <p>
              By using the Service, you acknowledge and accept the following inherent risks:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">AI unpredictability:</strong> AI-generated outputs may be inaccurate, misleading, or inappropriate despite safeguards. You should never rely solely on AI outputs for critical decisions</li>
              <li><strong className="text-white">Data breach risk:</strong> Despite our security measures, no platform can guarantee absolute protection against sophisticated cyberattacks. You should avoid storing highly sensitive information (e.g., Social Security numbers, bank account details) in conversations</li>
              <li><strong className="text-white">Third-party risks:</strong> Connected third-party services have their own security postures. A breach of a third-party provider could indirectly affect data shared through the Service</li>
              <li><strong className="text-white">API key exposure:</strong> If your device or account is compromised, API keys stored in the Service could be misused. Use API keys with the minimum required permissions and rotate them regularly</li>
              <li><strong className="text-white">Session security:</strong> You are responsible for securing your own devices and sessions. Always sign out when using shared or public devices</li>
            </ul>
            <p className="mt-4 font-medium text-white">Anti-Hacking and Unauthorized Access</p>
            <p className="mt-2">
              Any attempt to compromise the security of the Service is strictly prohibited and will be pursued to the fullest extent of the law. Prohibited activities include, but are not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Attempting to bypass authentication or authorization mechanisms</li>
              <li>Performing port scanning, vulnerability scanning, or penetration testing without explicit written permission</li>
              <li>Deploying denial-of-service (DoS/DDoS) attacks against the Service or its infrastructure</li>
              <li>Injecting malicious code, scripts, or payloads (including SQL injection, XSS, or CSRF attacks)</li>
              <li>Attempting to access, modify, or delete data belonging to other users</li>
              <li>Intercepting, sniffing, or tampering with network traffic to or from the Service</li>
              <li>Exploiting any vulnerability in the Service rather than responsibly disclosing it</li>
            </ul>
            <p className="mt-3">
              We reserve the right to immediately terminate accounts, report incidents to law enforcement, and pursue civil damages against any individual or entity that compromises or attempts to compromise the security of the Service. If you discover a security vulnerability, please report it responsibly to{" "}
              <a href="mailto:security@t3kniq.com" className="text-blue-400 hover:underline">
                security@t3kniq.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. AI-Generated Content</h2>
            <p>
              Content generated by AI agents through the Service is provided for informational purposes only. We make no guarantees regarding the accuracy, completeness, or suitability of AI-generated content. You are responsible for reviewing and verifying all outputs before relying on them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Intellectual Property</h2>
            <p>
              You retain ownership of content you create using the Service. We retain all rights to the Service itself, including its design, code, and underlying technology. You grant us a limited license to process your content solely for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">14. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, T3kniQ LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Loss of profits, revenue, or anticipated business income</li>
              <li>Loss of data, content, or AI-generated outputs</li>
              <li>Business interruption or loss of business opportunities</li>
              <li>Damages arising from service downtime, outages, or scheduled maintenance</li>
              <li>Damages arising from unauthorized access to your account or data breaches</li>
              <li>Damages arising from hacking, cyberattacks, or other security incidents affecting the Service or its infrastructure</li>
              <li>Damages arising from AI-generated content that is inaccurate, misleading, or causes harm</li>
              <li>Damages resulting from the actions or failures of third-party services connected through the platform</li>
            </ul>
            <p className="mt-3">
              You expressly acknowledge that T3kniQ LLC is not responsible for any loss of potential or actual revenue resulting from service interruptions, whether caused by technical failures, cyberattacks, maintenance, or any other reason. The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without any warranty of uninterrupted or error-free operation. In no event shall T3kniQ LLC&apos;s total liability exceed the amount you paid for the Service in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">15. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. T3KNIQ LLC SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">16. Acceptable Use of AI Outputs</h2>
            <p>
              You are solely responsible for how you use, publish, distribute, or act upon any content generated by AI agents through the Service. This includes, but is not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Verifying the accuracy and legality of AI-generated content before publishing or sharing it</li>
              <li>Ensuring AI-generated legal, financial, or medical content is reviewed by a qualified professional before reliance</li>
              <li>Taking full responsibility for any decisions made based on AI-generated advice or analysis</li>
              <li>Ensuring AI-generated content does not infringe upon third-party intellectual property rights</li>
              <li>Complying with applicable disclosure requirements when publishing AI-generated content (e.g., FTC guidelines on AI-generated endorsements)</li>
            </ul>
            <p className="mt-3">
              T3kniQ LLC shall not be liable for any damages, losses, or legal consequences arising from your use of or reliance on AI-generated outputs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">17. Account Security and Sharing</h2>
            <p>
              Each account is for a single authorized user. You may not share your account credentials with others or allow multiple individuals to access the Service through a single account. You are responsible for all activity that occurs under your account, whether or not authorized by you. If you become aware of any unauthorized use of your account, you must notify us immediately at{" "}
              <a href="mailto:security@t3kniq.com" className="text-blue-400 hover:underline">
                security@t3kniq.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">18. DMCA and Copyright Takedowns</h2>
            <p>
              T3kniQ LLC respects the intellectual property rights of others and acts as a service provider under the Digital Millennium Copyright Act (DMCA). If you believe that content generated or hosted through the Service infringes your copyright, you may submit a takedown notice to our designated agent at{" "}
              <a href="mailto:legal@t3kniq.com" className="text-blue-400 hover:underline">
                legal@t3kniq.com
              </a>{" "}
              with the following information:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Identification of the copyrighted work claimed to have been infringed</li>
              <li>Identification of the material that is claimed to be infringing and its location on the Service</li>
              <li>Your contact information (name, address, email, phone number)</li>
              <li>A statement that you have a good-faith belief that the use is not authorized</li>
              <li>A statement, under penalty of perjury, that the information in the notice is accurate and you are authorized to act on behalf of the rights holder</li>
              <li>Your physical or electronic signature</li>
            </ul>
            <p className="mt-3">
              We will respond to valid DMCA notices and may remove or disable access to the allegedly infringing content. Repeat infringers may have their accounts terminated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">19. Termination and Data Handling</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these terms, without prior notice or refund. You may cancel your account at any time through your account settings. Upon termination:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your right to use the Service ceases immediately</li>
              <li>You will have thirty (30) days from voluntary account cancellation to request an export of your data by contacting us</li>
              <li>After the 30-day period, or immediately upon termination for cause, we may permanently delete all data associated with your account</li>
              <li>We are not obligated to retain or provide access to any data after account termination</li>
              <li>Provisions that by their nature should survive termination (including indemnification, limitation of liability, and dispute resolution) shall survive</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">20. Force Majeure</h2>
            <p>
              T3kniQ LLC shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from events beyond our reasonable control, including but not limited to: natural disasters, acts of God, pandemics, epidemics, war, terrorism, civil unrest, government actions or orders, power failures, internet or telecommunications outages, failures of third-party hosting providers (including Google Cloud Platform), cyberattacks or security incidents affecting our infrastructure providers, labor disputes, or any other force majeure event. During such events, our obligations shall be suspended for the duration of the event without penalty.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">21. No Service Level Guarantee</h2>
            <p>
              Unless separately agreed in a written Service Level Agreement (SLA), the Service is provided without any guarantee of uptime, availability, response time, or performance. We make commercially reasonable efforts to maintain the availability of the Service but do not guarantee uninterrupted access. Scheduled maintenance, updates, and emergency fixes may cause temporary service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">22. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms shall be brought exclusively in the federal or state courts located in New York County, New York, and you hereby consent to the personal jurisdiction of such courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">23. Dispute Resolution and Arbitration</h2>
            <p>
              Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall be resolved through the following process:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">Step 1 — Informal Resolution:</strong> Before initiating formal proceedings, you agree to contact us at legal@t3kniq.com and attempt to resolve the dispute informally for at least thirty (30) days</li>
              <li><strong className="text-white">Step 2 — Binding Arbitration:</strong> If informal resolution fails, the dispute shall be settled by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. The arbitration shall be conducted in New York County, New York, by a single arbitrator</li>
              <li><strong className="text-white">Step 3 — Arbitration Award:</strong> The arbitrator&apos;s decision shall be final and binding. Judgment on the award may be entered in any court having jurisdiction</li>
            </ul>
            <p className="mt-3">
              The arbitration shall be conducted in English. Each party shall bear its own costs and attorneys&apos; fees, unless the arbitrator determines otherwise. Notwithstanding the above, either party may seek injunctive or equitable relief in court to prevent the actual or threatened infringement of intellectual property rights or to address security breaches.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">24. Class Action Waiver</h2>
            <p>
              YOU AGREE THAT ANY CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL BE BROUGHT IN YOUR INDIVIDUAL CAPACITY ONLY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON&apos;S CLAIMS AND MAY NOT OTHERWISE PRESIDE OVER ANY FORM OF A CLASS OR REPRESENTATIVE PROCEEDING. YOU ACKNOWLEDGE THAT BY AGREEING TO THESE TERMS, YOU ARE WAIVING YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">25. Electronic Communications</h2>
            <p>
              By creating an account, you consent to receive electronic communications from us, including but not limited to: account notifications, service updates, security alerts, billing receipts, marketing communications, and legal notices. These electronic communications satisfy any legal requirement that such communications be made in writing. You may opt out of marketing communications at any time, but you cannot opt out of transactional or legal notices related to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">26. Severability, Waiver, and Entire Agreement</h2>
            <p>
              <strong className="text-white">Severability:</strong> If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.
            </p>
            <p className="mt-3">
              <strong className="text-white">Waiver:</strong> The failure of T3kniQ LLC to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver of any provision shall be effective only if in writing and signed by T3kniQ LLC.
            </p>
            <p className="mt-3">
              <strong className="text-white">Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and T3kniQ LLC regarding the Service and supersede all prior and contemporaneous agreements, proposals, representations, and understandings, whether written or oral.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">27. Changes to Terms</h2>
            <p>
              We may update these Terms of Service at any time. We will notify users of material changes via email or through the Service at least thirty (30) days before the changes take effect. Continued use of the Service after the effective date constitutes acceptance of the updated terms. If you do not agree to the updated terms, you must discontinue use of the Service and cancel your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">28. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-1">
              <p><strong className="text-white">T3kniQ LLC</strong></p>
              <p>
                Email:{" "}
                <a href="mailto:legal@t3kniq.com" className="text-blue-400 hover:underline">
                  legal@t3kniq.com
                </a>
              </p>
              <p>
                Security:{" "}
                <a href="mailto:security@t3kniq.com" className="text-blue-400 hover:underline">
                  security@t3kniq.com
                </a>
              </p>
              <p>
                Privacy:{" "}
                <a href="mailto:privacy@t3kniq.com" className="text-blue-400 hover:underline">
                  privacy@t3kniq.com
                </a>
              </p>
            </div>
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
