export default function Home() {
  const modes = [
    {
      title: 'Playwright Testing Mode',
      envFlag: 'TEST_MODE=playwright',
      cmd: 'npm run test:playwright',
      desc: 'Deterministic browser automation for UI workflows, navigation, and backend API contracts.',
      badge: 'Deterministic',
      color: '#38bdf8',
    },
    {
      title: 'AI Testing Mode',
      envFlag: 'TEST_MODE=ai',
      cmd: 'npm run test:ai',
      desc: 'AI-assisted DOM inspection, candidate scenario generation (positive, negative, boundary), and failure diagnosis.',
      badge: 'Gemini AI',
      color: '#c084fc',
    },
    {
      title: 'Hybrid Testing Mode',
      envFlag: 'TEST_MODE=hybrid',
      cmd: 'npm run test:hybrid',
      desc: 'Combines Playwright browser navigation with AI page analysis, cross-validation, and failure diagnostics.',
      badge: 'Playwright + AI',
      color: '#34d399',
    },
  ];

  const commands = [
    { cmd: 'npm run test:playwright', desc: 'Run deterministic Playwright suite (Storefront UI + Backend API)' },
    { cmd: 'npm run test:ai', desc: 'Run AI-assisted testing suite (Discovery, candidate scenarios, failure analysis)' },
    { cmd: 'npm run test:hybrid', desc: 'Run Hybrid suite (Playwright execution + AI cross-validation & diagnostics)' },
    { cmd: 'npm run test:live', desc: 'Run tests against Live environment (https://digigold.twenty4.in/digigold)' },
    { cmd: 'npm run test:local', desc: 'Run tests against Local environment (http://localhost:3000/digigold)' },
    { cmd: 'npm run test:api', desc: 'Run fast backend API tests only (no browser launched)' },
    { cmd: 'npm run test:ui', desc: 'Run storefront UI tests with checkpoint screenshots' },
    { cmd: 'npm run test:report', desc: 'Open Playwright HTML execution report' },
    { cmd: 'npm run clean:reports', desc: 'Clear previous test reports, screenshots, and test results' },
  ];

  const suites = [
    {
      title: 'Storefront UI Suite',
      file: 'src/tests/ui.spec.ts',
      cmd: 'npm run test:ui',
      desc: 'Validates homepage, live metal ticker, navbar, collections, digital gold, and mobile responsiveness.',
      badge: 'Public UI',
      color: '#38bdf8',
    },
    {
      title: 'Backend API Suite',
      file: 'src/tests/api.spec.ts',
      cmd: 'npm run test:api',
      desc: 'Tests live rates ticker, mobile rates, app settings, admin auth guards, and OTP validation.',
      badge: 'Backend API',
      color: '#10b981',
    },
    {
      title: 'AI-Assisted Suite',
      file: 'src/tests/ai.spec.ts',
      cmd: 'npm run test:ai',
      desc: 'Interactive UI discovery, candidate scenario generation, credential sanitization, and failure analysis.',
      badge: 'AI Engine',
      color: '#c084fc',
    },
    {
      title: 'Hybrid Execution Suite',
      file: 'src/tests/hybrid.spec.ts',
      cmd: 'npm run test:hybrid',
      desc: 'Playwright browser navigation + AI scenario recommendation + API vs UI ticker cross-validation.',
      badge: 'Hybrid Flow',
      color: '#f59e0b',
    },
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#090d16', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: 32, marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212, 167, 44, 0.12)', border: '1px solid rgba(212, 167, 44, 0.35)', color: '#d4a72c', padding: '5px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span>✦</span> Twenty4 DigiGold Automated Testing
          </div>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, margin: '16px 0 10px', letterSpacing: '-0.025em', color: '#ffffff' }}>
            AI Testing Mode & Playwright Testing Mode
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.08rem', margin: 0, maxWidth: 820, lineHeight: 1.65 }}>
            Automated test framework supporting <strong style={{ color: '#f8fafc' }}>Playwright Mode</strong>, <strong style={{ color: '#f8fafc' }}>AI Testing Mode</strong>, and <strong style={{ color: '#f8fafc' }}>Hybrid Mode</strong>. Configured via <code style={{ color: '#38bdf8' }}>.env.local</code> with unified Google Sheets reporting, failure diagnostics, and zero-leak credential masking.
          </p>
        </header>

        {/* Testing Modes Cards */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚡</span> Supported Testing Modes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {modes.map((m) => (
              <div key={m.title} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: `${m.color}1a`, color: m.color, border: `1px solid ${m.color}40`, padding: '3px 12px', borderRadius: 999 }}>
                      {m.badge}
                    </span>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{m.envFlag}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>{m.title}</h3>
                  <p style={{ fontSize: '0.92rem', color: '#9ca3af', lineHeight: 1.55, margin: 0 }}>{m.desc}</p>
                </div>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1f2937' }}>
                  <code style={{ fontSize: 12, color: m.color, background: '#0b0f19', padding: '6px 12px', borderRadius: 6, display: 'inline-block', fontFamily: 'monospace' }}>
                    {m.cmd}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Config Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px 20px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Target URL (Live)</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginTop: 4, fontFamily: 'monospace' }}>
              https://digigold.twenty4.in/digigold/
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Normalized with /digigold subpath</div>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px 20px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Google Sheets Report</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginTop: 4 }}>
              Active (Preserves History)
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>reports/testing-report.csv</div>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px 20px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>AI Provider</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', marginTop: 4 }}>
              Google Gemini (Gemini 3.8 / 2.5)
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>With deterministic fallback</div>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px 20px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Security & Safety</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
              Zero-leak Credential Masking
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Non-destructive test guards</div>
          </div>
        </div>

        {/* Execution Commands */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>💻</span> Execution Commands
          </h2>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#0b0f19', borderBottom: '1px solid #1f2937', color: '#9ca3af', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Command</th>
                  <th style={{ padding: '14px 20px' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((c, i) => (
                  <tr key={c.cmd} style={{ borderBottom: i < commands.length - 1 ? '1px solid #1f2937' : 'none' }}>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#38bdf8' }}>
                      <code>{c.cmd}</code>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#d1d5db' }}>{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Test Suites Grid */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📁</span> Test Suites Breakdown
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {suites.map((s) => (
              <div key={s.file} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}40`, padding: '2px 10px', borderRadius: 999 }}>
                    {s.badge}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{s.file}</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>{s.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Google Sheets Sync Guide */}
        <section style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 12px' }}>
            📊 Google Sheets Reporting & Evidence Sync
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 16px' }}>
            Execution results across all testing modes automatically append to <code style={{ color: '#38bdf8' }}>reports/testing-report.csv</code> preserving full execution history, status, duration, error stacks, AI failure diagnostics, and relative screenshot paths.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a
              href="https://docs.google.com/spreadsheets/d/1WuI4b4okQxQaplg5nzg53uUldteyszUveon0nsrvYr8/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
              style={{ background: '#2563eb', color: '#ffffff', textDecoration: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Open Google Tracking Sheet ↗
            </a>
          </div>
        </section>

      </div>
    </main>
  );
}