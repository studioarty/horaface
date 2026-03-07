import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "Rajdhani, system-ui, sans-serif",
            fontSize: 72,
            fontWeight: 700,
            color: "var(--color-primary)",
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <p style={{ marginTop: 8, fontSize: 18, color: "var(--color-text-secondary)" }}>
          Página não encontrada
        </p>
        <Link
          to="/"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "10px 24px",
            borderRadius: 8,
            background: "var(--color-primary)",
            color: "var(--color-bg-base)",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Voltar ao Painel
        </Link>
      </div>
    </div>
  );
}
