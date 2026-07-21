// Starter Terms of Service — a template pending legal review, not legal advice. Keep the LAST-UPDATED
// date in sync with TERMS_VERSION in components/terms-gate.tsx so acceptance re-prompts on changes.
export const metadata = { title: "Terms of Service · CryptoPiggy" };

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

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-1 flex-col overflow-y-auto px-6 py-10">
      <a href="/app" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
        ← Back
      </a>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-1 text-xs text-muted">Last updated 2026-07-19</p>

      <Section n="1" title="What CryptoPiggy is">
        <p>
          CryptoPiggy is <span className="font-medium text-ink">non-custodial software</span> that helps
          you deploy your own crypto assets into on-chain protocols. Your funds are held in a smart
          account that only you control. We never take custody of, hold, or have the ability to move your
          funds. Every transaction is signed and submitted by you.
        </p>
      </Section>

      <Section n="2" title="Not investment advice">
        <p>
          Any strategy, allocation, or projection shown is{" "}
          <span className="font-medium text-ink">informational only and is not investment, financial,
          legal, or tax advice</span>, and is not a recommendation to buy, sell, or hold any asset. You
          are solely responsible for your decisions. Consider seeking advice from a licensed professional.
        </p>
      </Section>

      <Section n="3" title="Risk">
        <p>
          Crypto assets are highly volatile and{" "}
          <span className="font-medium text-ink">you can lose some or all of your money</span>. Projected
          returns, ranges, and “bad case / good case” figures are estimates based on historical data — they
          are not guarantees of future results. Smart contracts, protocols, and networks carry risks
          including bugs, exploits, and loss of funds. Do not deposit more than you can afford to lose.
        </p>
      </Section>

      <Section n="4" title="No warranty">
        <p>
          The service is provided <span className="font-medium text-ink">“as is” and “as available,”
          without warranties of any kind</span>, express or implied, including merchantability, fitness for
          a particular purpose, and non-infringement. We do not warrant that the service will be
          uninterrupted, secure, or error-free.
        </p>
      </Section>

      <Section n="5" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, CryptoPiggy and its operators will not be liable for any
          indirect, incidental, special, consequential, or exemplary damages, or for any loss of funds,
          profits, or data, arising from your use of the service.
        </p>
      </Section>

      <Section n="6" title="Eligibility & prohibited use">
        <p>
          You must be of legal age in your jurisdiction and legally permitted to use crypto services. You
          may not use the service if you are located in, or are a resident of, a sanctioned or restricted
          jurisdiction, and you may not use it for any unlawful purpose.
        </p>
      </Section>

      <Section n="7" title="Changes">
        <p>
          We may update these Terms. Material changes will require you to accept again before continuing to
          use the app. Continued use after an update means you accept the revised Terms.
        </p>
      </Section>

      <Section n="8" title="Contact">
        <p>Questions about these Terms? Contact the team through the project’s official channels.</p>
      </Section>

      <p className="mt-8 text-xs text-faint">
        This document is a starting template and does not constitute legal advice.
      </p>
    </main>
  );
}
