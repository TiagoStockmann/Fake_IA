import { useEffect } from "react";

/**
 * fake.ia — App estático servido a partir de /public/app/
 * Substituímos a página inicial do projeto por um redirect imediato
 * para /app/index.html, que contém o HTML/CSS/JS originais (modernizados).
 * Backend (webhook n8n) permanece inalterado.
 */
const Index = () => {
  useEffect(() => {
    window.location.replace("/app/index.html");
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0613", color: "#F4F1FF", fontFamily: "system-ui" }}>
      <p>Carregando fake.ia…</p>
    </div>
  );
};

export default Index;
