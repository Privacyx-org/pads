// src/App.jsx
import React, { useState } from "react";

const API_BASE = "http://127.0.0.1:8000";
const PRIMARY = "#4befa0";

const spinnerStyle = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (max-width: 900px) {
  .pads-grid {
    grid-template-columns: 1fr !important;
  }
  .pads-right {
    min-height: 240px;
  }
}
`;

// petit composant pour afficher le niveau de confiance
const ConfidenceBadge = ({ score, theme = "dark" }) => {
  if (typeof score !== "number") return null;

  let text = "low confidence";
  let bg =
    theme === "dark"
      ? "rgba(248,113,113,0.08)"
      : "rgba(248,113,113,0.12)";
  let border =
    theme === "dark"
      ? "1px solid rgba(248,113,113,0.25)"
      : "1px solid rgba(248,113,113,0.4)";

  if (score >= 0.9) {
    text = "very confident";
    bg =
      theme === "dark"
        ? "rgba(74,222,128,0.08)"
        : "rgba(34,197,94,0.12)";
    border =
      theme === "dark"
        ? "1px solid rgba(74,222,128,0.25)"
        : "1px solid rgba(34,197,94,0.35)";
  } else if (score >= 0.6) {
    text = "confident";
    bg =
      theme === "dark"
        ? "rgba(250,204,21,0.08)"
        : "rgba(234,179,8,0.12)";
    border =
      theme === "dark"
        ? "1px solid rgba(250,204,21,0.25)"
        : "1px solid rgba(234,179,8,0.35)";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        background: bg,
        border,
        marginTop: 6,
      }}
    >
      {text}
    </span>
  );
};

// diagnostic lisible en français
const Diagnosis = ({ label, score, theme = "dark", from = "image" }) => {
  if (!label && typeof score !== "number") return null;

  const isArtificial =
    typeof label === "string" &&
    ["artificial", "ai", "ai-generated", "synthetic", "fake"].includes(
      label.toLowerCase()
    );
  const isHuman =
    typeof label === "string" &&
    ["human", "real"].includes(label.toLowerCase());

  let verdict = "Result: model returned a label";
  let detail = "";

  if (isArtificial) {
    verdict = "Likely AI-generated";
    detail =
      "The detector found patterns that are typically present in synthetic / AI images.";
  } else if (isHuman) {
    verdict = "Likely real / human-captured";
    detail =
      "The detector did not find strong signs of AI generation on this " +
      (from === "video" ? "frame/video." : "image.");
  } else if (label) {
    verdict = `Label returned: ${label}`;
  }

  const textColor = theme === "dark" ? "white" : "#0f172a";
  const muted = theme === "dark" ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)";
  const panelBg =
    theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.7)";
  const panelBorder =
    theme === "dark"
      ? "1px solid rgba(255,255,255,0.02)"
      : "1px solid rgba(15,23,42,0.04)";

  return (
    <div
      style={{
        background: panelBg,
        border: panelBorder,
        borderRadius: 12,
        padding: 10,
        marginTop: 10,
      }}
    >
      <p style={{ fontWeight: 600, fontSize: 12, color: textColor }}>
        {verdict}
      </p>
      {detail ? (
        <p style={{ fontSize: 11, marginTop: 4, color: muted }}>{detail}</p>
      ) : null}
      {typeof score === "number" ? (
        <p style={{ fontSize: 11, marginTop: 4, color: muted }}>
          detector score: {(score * 100).toFixed(1)}%
        </p>
      ) : null}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState("image");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState("dark"); // 👈 toggle

  const isDark = theme === "dark";

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const analyze = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    const endpoint =
      activeTab === "image" ? "/analyze/image" : "/analyze/video";

    try {
      const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail || `Request failed with status ${res.status}`
        );
      }

      const data = await res.json();
      const now = new Date();

      setResult(data);
      setBackendOnline(true);
      setLastRun(now);

      setHistory((prev) => {
        const newItem = {
          id: now.getTime(),
          tab: activeTab,
          result: data,
          ranAt: now.toISOString(),
          filename: data.filename ?? file.name ?? "unknown",
        };
        return [newItem, ...prev].slice(0, 5);
      });
    } catch (err) {
      setError(err.message);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setActiveTab(item.tab);
    setResult(item.result);
    setError(null);
    setLastRun(item.ranAt ? new Date(item.ranAt) : null);
  };

  const renderJSON = (obj) => (
    <pre
      style={{
        background: isDark ? "rgba(0,0,0,0.3)" : "rgba(15,23,42,0.04)",
        borderRadius: 12,
        padding: 12,
        fontSize: 12,
        overflow: "auto",
        maxHeight: 320,
        color: isDark ? "white" : "#0f172a",
      }}
    >
      {JSON.stringify(obj, null, 2)}
    </pre>
  );

  const renderVideoFrames = () => {
    if (!result?.frames || !Array.isArray(result.frames)) return null;

    return (
      <div style={{ marginTop: 16 }}>
        <h3
          style={{
            fontWeight: 600,
            marginBottom: 8,
            color: isDark ? "white" : "#0f172a",
          }}
        >
          Extracted frames
        </h3>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          {result.frames.map((fr, idx) => {
            const path = fr.path;
            const imgUrl = path ? `${API_BASE}/${path}` : null;
            const isError = fr.error;

            return (
              <div
                key={idx}
                style={{
                  background: isError
                    ? isDark
                      ? "rgba(248,113,113,0.05)"
                      : "rgba(248,113,113,0.09)"
                    : isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.7)",
                  border: isError
                    ? "1px solid rgba(248,113,113,0.4)"
                    : isDark
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "1px solid rgba(15,23,42,0.04)",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    opacity: isDark ? 0.75 : 0.6,
                    color: isDark ? "white" : "#0f172a",
                  }}
                >
                  {fr.timestamp}s
                </p>
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={`frame-${idx}`}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 8,
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "1px solid rgba(15,23,42,0.05)",
                    }}
                  />
                ) : (
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(248,113,113,0.9)",
                      marginTop: 6,
                    }}
                  >
                    {fr.error ?? "No image"}
                  </p>
                )}
                {fr.analysis ? (
                  <p style={{ fontSize: 11, marginTop: 6 }}>
                    <span
                      style={{
                        opacity: 0.6,
                        color: isDark ? "white" : "#0f172a",
                      }}
                    >
                      label:{" "}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {fr.analysis.label ?? "—"}
                    </span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBackendBadge = () => {
    return (
      <span
        style={{
          marginLeft: 8,
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          background: backendOnline
            ? isDark
              ? "rgba(74,222,128,0.12)"
              : "rgba(34,197,94,0.14)"
            : isDark
              ? "rgba(248,113,113,0.12)"
              : "rgba(248,113,113,0.14)",
          border: backendOnline
            ? "1px solid rgba(74,222,128,0.4)"
            : "1px solid rgba(248,113,113,0.4)",
          color: backendOnline ? "#22c55e" : "#f87171",
          textTransform: "lowercase",
        }}
      >
        {backendOnline ? "online" : "offline"}
      </span>
    );
  };

  const lastRunString = lastRun
    ? lastRun.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  // pour le mode clair / sombre
  const rootBackground = isDark
    ? "radial-gradient(circle at top, #111 0%, #000 65%)"
    : "radial-gradient(circle at top, #f8fafc 0%, #e2e8f0 65%)";
  const rootColor = isDark ? "white" : "#0f172a";
  const panelBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const panelBorder = isDark
    ? "1px solid rgba(255,255,255,0.05)"
    : "1px solid rgba(15,23,42,0.05)";
  const rightPanelBg = isDark
    ? "rgba(255,255,255,0.015)"
    : "rgba(255,255,255,0.9)";
  const rightPanelBorder = isDark
    ? "1px solid rgba(255,255,255,0.02)"
    : "1px solid rgba(15,23,42,0.035)";

  return (
    <>
      <style>{`
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          background: ${isDark ? "#000" : "#e2e8f0"};
        }
        ${spinnerStyle}
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          background: rootBackground,
          color: rootColor,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            width: "100%",
            padding: "14px 28px",
            borderBottom: isDark
              ? "1px solid rgba(255,255,255,0.05)"
              : "1px solid rgba(15,23,42,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isDark
                  ? "rgba(75,239,160,0.12)"
                  : "rgba(79,239,160,0.15)",
                border: `1px solid rgba(75,239,160,0.4)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: PRIMARY,
              }}
            >
              P
            </div>
            <div>
              <h1 style={{ fontWeight: 600, fontSize: 16 }}>PADS Console</h1>
              <p
                style={{
                  fontSize: 11,
                  opacity: isDark ? 0.5 : 0.6,
                }}
              >
                PrivacyX AI Detection Service
              </p>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              opacity: isDark ? 0.5 : 0.75,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            Backend:{" "}
            <span style={{ color: PRIMARY, fontWeight: 500 }}>
              {API_BASE}
            </span>
            {renderBackendBadge()}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              style={{
                marginLeft: 10,
                background: isDark ? "rgba(255,255,255,0.04)" : "white",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(15,23,42,0.05)",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 11,
                cursor: "pointer",
                color: isDark ? "white" : "#0f172a",
              }}
            >
              {isDark ? "☀︎ Light" : "☾ Dark"}
            </button>
          </div>
        </header>

        {/* MAIN */}
        <main
          style={{
            flex: 1,
            width: "100%",
            boxSizing: "border-box",
            padding: "22px 24px 28px 24px",
          }}
        >
          <div
            className="pads-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 420px) 1fr",
              gap: 22,
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            {/* COLONNE GAUCHE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setActiveTab("image");
                    setFile(null);
                    setResult(null);
                    setError(null);
                  }}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    background:
                      activeTab === "image"
                        ? PRIMARY
                        : isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.04)",
                    color: activeTab === "image" ? "#000" : rootColor,
                    cursor: "pointer",
                  }}
                >
                  Analyze Image
                </button>
                <button
                  onClick={() => {
                    setActiveTab("video");
                    setFile(null);
                    setResult(null);
                    setError(null);
                  }}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    background:
                      activeTab === "video"
                        ? PRIMARY
                        : isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.04)",
                    color: activeTab === "video" ? "#000" : rootColor,
                    cursor: "pointer",
                  }}
                >
                  Analyze Video
                </button>
              </div>

              {/* Upload */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  background: panelBg,
                  border: panelBorder,
                  borderRadius: 18,
                  minHeight: 210,
                  padding: 20,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    marginBottom: 12,
                    opacity: isDark ? 0.7 : 0.8,
                  }}
                >
                  {activeTab === "image"
                    ? "Drop an image here or choose a file"
                    : "Drop a video here or choose a file"}
                </p>
                <input
                  type="file"
                  accept={activeTab === "image" ? "image/*" : "video/*"}
                  onChange={handleFileChange}
                  id="file-input"
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="file-input"
                  style={{
                    display: "inline-block",
                    padding: "7px 16px",
                    borderRadius: 10,
                    background: PRIMARY,
                    color: "#000",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Choose file
                </label>
                <div style={{ marginTop: 10 }}>
                  {file ? (
                    <p style={{ fontSize: 12, opacity: isDark ? 0.6 : 0.7 }}>
                      {file.name} — {(file.size / 1024).toFixed(1)} KB
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, opacity: isDark ? 0.25 : 0.4 }}>
                      No file selected yet.
                    </p>
                  )}
                </div>
                <button
                  onClick={analyze}
                  disabled={loading}
                  style={{
                    marginTop: 16,
                    padding: "7px 16px",
                    borderRadius: 10,
                    background: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.85)",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.03)"
                      : "1px solid rgba(15,23,42,0.0)",
                    color: "white",
                    fontSize: 13,
                    cursor: "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "Analyzing..." : "Run analysis"}
                </button>
              </div>

              {/* Result (JSON uniquement) */}
              <div
                style={{
                  background: panelBg,
                  border: panelBorder,
                  borderRadius: 18,
                  padding: 20,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                  Result
                </h2>

                {loading ? (
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "9999px",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTopColor: PRIMARY,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <p style={{ fontSize: 12, opacity: isDark ? 0.5 : 0.6 }}>
                      Analyzing…
                    </p>
                  </div>
                ) : null}

                {error && !loading && (
                  <div
                    style={{
                      background: isDark
                        ? "rgba(248,113,113,0.08)"
                        : "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 12,
                      marginTop: 10,
                    }}
                  >
                    {error}
                  </div>
                )}

                {!error && !result && !loading && (
                  <p style={{ fontSize: 12, opacity: isDark ? 0.35 : 0.5 }}>
                    No analysis yet. Upload a file and click “Run analysis”.
                  </p>
                )}

                {result && renderJSON(result)}
              </div>

              {/* Historique des runs */}
              {history.length > 0 ? (
                <div
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.01)"
                      : "rgba(255,255,255,0.85)",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.03)"
                      : "1px solid rgba(15,23,42,0.03)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <h3 style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                    Last runs
                  </h3>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        style={{
                          textAlign: "left",
                          background: isDark
                            ? "rgba(255,255,255,0.01)"
                            : "rgba(241,245,249,0.6)",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.02)"
                            : "1px solid rgba(15,23,42,0.03)",
                          borderRadius: 10,
                          padding: "6px 10px",
                          color: rootColor,
                          fontSize: 11,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          cursor: "pointer",
                        }}
                      >
                        <span>
                          {item.tab === "image" ? "🖼️" : "🎞️"} {item.filename}
                        </span>
                        <span style={{ opacity: 0.4 }}>
                          {item.ranAt
                            ? new Date(item.ranAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* COLONNE DROITE */}
            <div
              className="pads-right"
              style={{
                width: "100%",
                background: rightPanelBg,
                border: rightPanelBorder,
                borderRadius: 18,
                padding: 20,
                minHeight: 340,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  gap: 10,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>
                  {activeTab === "video" ? "Video summary" : "Preview / Output"}
                </h2>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      background: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.04)",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "1px solid rgba(15,23,42,0.04)",
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    model:{" "}
                    {activeTab === "image"
                      ? result?.analysis?.model ?? "local"
                      : "local"}
                  </span>
                  {lastRunString ? (
                    <span style={{ fontSize: 10, opacity: 0.35 }}>
                      last run: {lastRunString}
                    </span>
                  ) : null}
                </div>
              </div>

              {activeTab === "image" ? (
                <>
                  {result && typeof result.stored_at === "string" ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <img
                        src={`${API_BASE}/${result.stored_at}`}
                        alt="preview"
                        style={{
                          width: 260,
                          maxWidth: "100%",
                          borderRadius: 12,
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid rgba(15,23,42,0.07)",
                          background: isDark ? "#000" : "#f8fafc",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <p
                          style={{
                            fontSize: 12,
                            opacity: isDark ? 0.6 : 0.7,
                            marginBottom: 4,
                          }}
                        >
                          Raw analysis
                        </p>
                        <div
                          style={{
                            background: isDark
                              ? "rgba(0,0,0,0.2)"
                              : "rgba(255,255,255,0.7)",
                            border: isDark
                              ? "1px solid rgba(255,255,255,0.02)"
                              : "1px solid rgba(15,23,42,0.04)",
                            borderRadius: 12,
                            padding: 10,
                            fontSize: 12,
                          }}
                        >
                          <p>
                            <strong>label:</strong>{" "}
                            {result.analysis?.label ?? "—"}
                          </p>
                          <p>
                            <strong>score:</strong>{" "}
                            {typeof result.analysis?.score === "number"
                              ? result.analysis.score.toFixed(4)
                              : "—"}
                          </p>
                          <ConfidenceBadge
                            score={result.analysis?.score}
                            theme={theme}
                          />
                          <p style={{ marginTop: 6 }}>
                            <strong>model:</strong>{" "}
                            {result.analysis?.model ?? "local"}
                          </p>
                        </div>

                        <Diagnosis
                          label={result.analysis?.label}
                          score={result.analysis?.score}
                          theme={theme}
                          from="image"
                        />
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, opacity: 0.3 }}>
                      Upload a file to see the extended output here.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* 👉 pas de vidéo ici, juste le raw + summary + frames */}

                  {result ? (
                    <>
                      {/* Raw analysis pour la vidéo */}
                      <div
                        style={{
                          background: isDark
                            ? "rgba(0,0,0,0.2)"
                            : "rgba(255,255,255,0.7)",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.02)"
                            : "1px solid rgba(15,23,42,0.04)",
                          borderRadius: 12,
                          padding: 10,
                          fontSize: 12,
                          marginBottom: 14,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            marginBottom: 6,
                          }}
                        >
                          Raw analysis
                        </p>
                        {/* on prend le premier frame pour le label */}
                        {Array.isArray(result.frames) &&
                        result.frames.length > 0 &&
                        result.frames[0].analysis ? (
                          <>
                            <p>
                              <strong>first frame label:</strong>{" "}
                              {result.frames[0].analysis.label ?? "—"}
                            </p>
                            <p>
                              <strong>score:</strong>{" "}
                              {typeof result.frames[0].analysis.score ===
                              "number"
                                ? result.frames[0].analysis.score.toFixed(4)
                                : "—"}
                            </p>
                            <ConfidenceBadge
                              score={result.frames[0].analysis.score}
                              theme={theme}
                            />
                            <Diagnosis
                              label={result.frames[0].analysis.label}
                              score={result.frames[0].analysis.score}
                              theme={theme}
                              from="video"
                            />
                          </>
                        ) : (
                          <p
                            style={{
                              fontSize: 11,
                              opacity: 0.7,
                            }}
                          >
                            No frame-level analysis found.
                          </p>
                        )}
                      </div>

                      {result.summary ? (
                        <div
                          style={{
                            marginBottom: 14,
                            fontSize: 12,
                            opacity: 0.8,
                            display: "flex",
                            gap: 30,
                            flexWrap: "wrap",
                          }}
                        >
                          <p>
                            Frames analyzed:{" "}
                            <strong>{result.summary.frames_analyzed}</strong>
                          </p>
                          <p>
                            Labels:{" "}
                            {Array.isArray(result.summary.labels) &&
                            result.summary.labels.length > 0
                              ? result.summary.labels.join(", ")
                              : "—"}
                          </p>
                          <p>
                            First human at:{" "}
                            {result.summary.first_human_at != null
                              ? `${result.summary.first_human_at}s`
                              : "—"}
                          </p>
                          {!result.summary.ffmpeg_ok ? (
                            <span
                              style={{
                                fontSize: 11,
                                background: "rgba(248,113,113,0.08)",
                                border: "1px solid rgba(248,113,113,0.25)",
                                borderRadius: 999,
                                padding: "3px 10px",
                                color: "#fca5a5",
                              }}
                            >
                              ffmpeg missing on server
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {renderVideoFrames()}
                    </>
                  ) : (
                    <p style={{ fontSize: 12, opacity: 0.3 }}>
                      Upload a file to see the extended output here.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default App;

