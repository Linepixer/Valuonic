const VERSION = import.meta.env.VITE_APP_VERSION;
const COMMIT = import.meta.env.VITE_APP_COMMIT;

export default function AppVersion() {
  if (!COMMIT) {
    return <span className="app-version" title="Build local">v{VERSION}</span>;
  }
  return (
    <a
      className="app-version"
      href={`https://github.com/Linepixer/Valuonic/commit/${COMMIT}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Commit ${COMMIT}`}
    >
      v{VERSION}
    </a>
  );
}
