export default function ConnectorHomePage() {
  return (
    <main>
      <section className="card">
        <h1>FMWeb Connector</h1>
        <p>Phase 1 connector service is online.</p>
        <p>
          Use <code>/api/health</code> and <code>/api/version</code> to verify readiness.
        </p>
      </section>
    </main>
  );
}
