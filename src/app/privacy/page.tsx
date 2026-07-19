// Starter Privacy Policy — a template pending legal review, not legal advice.
export const metadata = { title: "Privacy Policy · CryptoPiggy" };

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-ink">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
      <a href="/app" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
        ← Back
      </a>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-xs text-muted">Last updated 2026-07-19</p>

      <Section n="1" title="What we collect">
        <p>
          Because CryptoPiggy is non-custodial, we collect as little as possible. Depending on how you use
          the app, that may include: your <span className="font-medium text-ink">public wallet address</span>{" "}
          and on-chain activity (which is already public on the blockchain), basic{" "}
          <span className="font-medium text-ink">usage analytics</span> (pages viewed, actions taken,
          device/browser info), and — if you sign in — the login identifier handled by our wallet provider.
          We do not take custody of funds and do not collect your private keys.
        </p>
      </Section>

      <Section n="2" title="How we use it">
        <p>
          To operate and improve the service, provide support, keep it secure, and comply with legal
          obligations. We do not sell your personal information.
        </p>
      </Section>

      <Section n="3" title="Third parties">
        <p>
          We rely on service providers to run the app — for example a wallet/authentication provider,
          blockchain infrastructure (RPC) providers, and analytics/error-tracking tools. These providers
          process data on our behalf under their own terms and privacy policies.
        </p>
      </Section>

      <Section n="4" title="Your choices">
        <p>
          You can use the app without connecting personal information beyond your wallet. Depending on your
          jurisdiction, you may have rights to access, correct, or delete your data — contact us to exercise
          them. Note that on-chain data is public and permanent and cannot be deleted.
        </p>
      </Section>

      <Section n="5" title="Changes">
        <p>We may update this policy; material changes will be reflected by the date above.</p>
      </Section>

      <Section n="6" title="Contact">
        <p>Questions about privacy? Contact the team through the project’s official channels.</p>
      </Section>

      <p className="mt-8 text-xs text-faint">
        This document is a starting template and does not constitute legal advice.
      </p>
    </main>
  );
}
