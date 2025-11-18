import { useRef, useState, useEffect } from "react";

function App() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [step, setStep] = useState("home"); // 'home' | 'record' | 'result'
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [timer, setTimer] = useState(0);

  // 녹음 시간 타이머
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const handleStart = async () => {
    setErrorMsg("");
    setResult(null);
    setTimer(0);
    setStep("record");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());

        // 프론트에서 다시 듣기용 URL
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        setIsLoading(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");

          const res = await fetch("http://localhost:8000/api/analyze", {
            method: "POST",
            body: formData,
          });

          const text = await res.text();
          console.log("status:", res.status);
          console.log("body:", text);

          if (!res.ok) {
            setErrorMsg(`서버 오류 (${res.status}) : ${text}`);
            setStep("home");
            return;
          }

          const data = JSON.parse(text);
          setResult(data);
          setErrorMsg("");
          setStep("result");
        } catch (err) {
          console.error(err);
          setErrorMsg(`요청 실패: ${err.message}`);
          setStep("home");
        } finally {
          setIsLoading(false);
        }
      };

      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("마이크 권한을 확인해주세요.");
      setStep("home");
    }
  };

  const handleStop = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleGoHome = () => {
    setStep("home");
    setResult(null);
    setErrorMsg("");
    setAudioUrl("");
    setTimer(0);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #ecfdf3 0, #f9fafb 45%, #eef2ff 100%)",
        padding: "32px 16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        {/* 헤더 */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #0f766e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "18px",
              }}
            >
              E
            </div>
            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Edulog
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                Edulog
              </div>
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "#6b7280" }}>
            현재 단계:{" "}
            <strong>
              {step === "home"
                ? "준비"
                : step === "record"
                ? "녹음 중"
                : "분석 결과"}
            </strong>
          </div>
        </header>

        {/* 메인 콘텐츠 카드 */}
        <main
          style={{
            backgroundColor: "#f1f5f9",
            borderRadius: "28px",
            padding: "20px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
          }}
        >
          {step === "home" && (
            <HomeView onStart={handleStart} errorMsg={errorMsg} />
          )}

          {step === "record" && (
            <RecordingView
              isRecording={isRecording}
              isLoading={isLoading}
              timer={timer}
              onStop={handleStop}
              errorMsg={errorMsg}
            />
          )}

          {step === "result" && (
            <ResultView
              result={result}
              audioUrl={audioUrl}
              onGoHome={handleGoHome}
            />
          )}

          {/* 로딩 상태 공통 표시 */}
          {isLoading && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                color: "#4b5563",
              }}
            >
              서버에서 음성을 분석하고 있습니다...
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------------------- 각 화면 컴포넌트 ---------------------- */

function HomeView({ onStart, errorMsg }) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: "24px",
        alignItems: "center",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "8px",
          }}
        >
          한 번의 녹음으로
          <br />
          발표 습관을 데이터로 확인하세요.
        </h1>
        <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "16px" }}>
          마이크로 발표를 녹음하면 AI가 말 속도, 음량, 침묵, 피치 등 6가지
          지표를 분석하여
          <br />
          이해하기 쉬운 점수와 피드백으로 정리해 드립니다.
        </p>

        <ul
          style={{
            fontSize: "12px",
            color: "#374151",
            marginBottom: "16px",
            paddingLeft: "18px",
          }}
        >
          <li>발화 속도(WPM)와 음량(dBFS)을 한눈에 확인</li>
          <li>침묵 비율, 피치 변화 등 발표 습관 분석</li>
          <li>초반/중반/후반 구간별 개선 포인트 제공</li>
        </ul>

        <button
          onClick={onStart}
          style={{
            padding: "10px 20px",
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #0f766e 100%)",
            color: "white",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🎙️ 녹음 시작하기
        </button>

        {errorMsg && (
          <p style={{ marginTop: "10px", fontSize: "12px", color: "red" }}>
            {errorMsg}
          </p>
        )}
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          padding: "16px",
          boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
          fontSize: "12px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          데모 안내
        </p>
        <ol style={{ paddingLeft: "18px", color: "#4b5563" }}>
          <li>“녹음 시작하기” 버튼을 눌러 10~20초 정도 말합니다.</li>
          <li>“녹음 종료 & 분석” 버튼을 누르면 서버에서 음성을 분석합니다.</li>
          <li>잠시 후 분석 결과와 지표별 피드백이 한 화면에 표시됩니다.</li>
        </ol>
      </div>
    </section>
  );
}

function RecordingView({ isRecording, isLoading, timer, onStop, errorMsg }) {
  return (
    <section>
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          padding: "22px 24px",
          boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            녹음 중입니다...
          </p>
          <p style={{ fontSize: "12px", color: "#4b5563" }}>
            평소 발표하듯이 10~20초 정도 자연스럽게 말해 보세요.
          </p>
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                backgroundColor: isRecording ? "#ef4444" : "#9ca3af",
              }}
            />
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {formatTime(timer)}
            </span>
          </div>
        </div>

        <button
          onClick={onStop}
          disabled={!isRecording || isLoading}
          style={{
            padding: "10px 18px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: isRecording ? "#ef4444" : "#9ca3af",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            cursor: isRecording ? "pointer" : "not-allowed",
          }}
        >
          ⏹ 녹음 종료 & 분석
        </button>
      </div>

      {errorMsg && (
        <p style={{ marginTop: "8px", fontSize: "12px", color: "red" }}>
          {errorMsg}
        </p>
      )}
    </section>
  );
}

function ResultView({ result, audioUrl, onGoHome }) {
  if (!result) return null;

  const m = result.metrics || {};
  const s = result.scores || {};

  const durationSec = m.duration_sec ?? 0;
  const durationText = formatDuration(durationSec);
  const totalScore = s.Score ?? 0;
  const grade = getGrade(totalScore);
  const approxWPM = m.sps ? Math.round(m.sps * 60 * 0.7) : null;

  const segments = result.segments || [];
  const feedbackLines = makeFeedbackLines(m, s, segments);

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "960px",
      }}
    >
      {/* 상단 타이틀 + 버튼 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "26px", fontWeight: 700 }}>분석 결과</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
            녹음 시간: {durationText}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              cursor: "not-allowed",
            }}
          >
            📁 기록 저장 (추후)
          </button>
          <button
            onClick={onGoHome}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#10b981",
              color: "white",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🏠 홈으로
          </button>
        </div>
      </div>

      {/* 메인 점수 카드 */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
          padding: "28px 32px 32px",
          marginBottom: "18px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "54px",
            fontWeight: 800,
            color: "#10b981",
          }}
        >
          {Math.round(totalScore)}
        </p>
        <p
          style={{
            marginTop: "6px",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          등급: {grade}
        </p>

        {/* 진행 바 */}
        <div
          style={{
            marginTop: "20px",
            width: "100%",
            maxWidth: "460px",
            height: "10px",
            backgroundColor: "#e5e7eb",
            borderRadius: "999px",
            marginLeft: "auto",
            marginRight: "auto",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(Math.max(totalScore, 0), 100)}%`,
              backgroundColor: "#10b981",
            }}
          />
        </div>

        <p
          style={{
            marginTop: "16px",
            fontSize: "13px",
            color: "#4b5563",
          }}
        >
          {makeSummarySentence(totalScore)}
        </p>
      </div>

      {/* 핵심 지표 카드 3개 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <SimpleMetricBox
          title="발화 속도 (WPM)"
          value={approxWPM ? `${approxWPM}` : "–"}
          subtitle="적정 범위: 120~150"
        />
        <SimpleMetricBox
          title="평균 음량 (dBFS)"
          value={m.rms != null ? m.rms.toFixed(1) : "–"}
          subtitle="적정 범위: -18.0 ~ -12.0"
        />
        <SimpleMetricBox
          title="침묵 비율"
          value={m.sil != null ? `${m.sil.toFixed(1)}%` : "–"}
          subtitle="전체 시간 대비"
        />
      </div>

      {/* WPM 추이 / 음량 파형 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <WpmChartBox approxWPM={approxWPM} durationSec={durationSec} />
        <VolumeChartBox rms={m.rms} durationSec={durationSec} />
      </div>

      {/* 피치 분포 / 개선 피드백 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <PitchChartBox f0r={m.f0r} durationSec={durationSec} />
        <FeedbackBox feedbackLines={feedbackLines} />
      </div>

      {/* 녹음 다시 듣기 */}
      {audioUrl && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
            padding: "18px 20px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            녹음 다시 듣기
          </p>
          <audio controls style={{ width: "100%" }}>
            <source src={audioUrl} type="audio/webm" />
            브라우저가 오디오 재생을 지원하지 않습니다.
          </audio>
        </div>
      )}
    </section>
  );
}

/* ---------------------- 카드/그래프 컴포넌트 ---------------------- */

function SimpleMetricBox({ title, value, subtitle }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
        padding: "14px 16px",
      }}
    >
      <p style={{ fontSize: "12px", color: "#6b7280" }}>{title}</p>
      <p
        style={{
          fontSize: "20px",
          fontWeight: 700,
          marginTop: "4px",
          marginBottom: "4px",
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: "11px", color: "#9ca3af" }}>{subtitle}</p>
    </div>
  );
}

function WpmChartBox({ approxWPM, durationSec }) {
  const value = approxWPM && approxWPM > 0 ? approxWPM : null;

  // y축 범위 (0 ~ 200 WPM)
  const yMax = 200;
  const yMid = 100;

  // x축: 녹음 길이 (최소 10초)
  const totalSec = durationSec && durationSec > 0 ? durationSec : 10;
  const xMax = Math.max(10, Math.round(totalSec));
  const xLabels = [
    0,
    Math.round(xMax * 0.25),
    Math.round(xMax * 0.5),
    Math.round(xMax * 0.75),
    xMax,
  ];

  const baseNorm = value ? Math.min(value / yMax, 1) : 0.4;
  const barFactors = [0.8, 1.0, 0.9, 1.1, 0.95];
  const bars = barFactors.map((f) =>
    Math.max(0.05, Math.min(baseNorm * f, 1))
  );

  let label = "데이터 부족";
  if (value) {
    if (value > 150) label = "조금 빠른 편";
    else if (value < 110) label = "조금 느린 편";
    else label = "적정 속도";
  }

  const minWpm = value ? Math.round(value * 0.8) : null;
  const maxWpm = value ? Math.round(value * 1.2) : null;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        padding: "16px 18px 18px",
      }}
    >
      <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
        WPM 추이
      </p>
      <p style={{ fontSize: "12px", color: "#6b7280" }}>
        평균 WPM:{" "}
        <strong style={{ color: "#111827" }}>
          {value ? value : "측정 불가"}
        </strong>
      </p>
      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
        권장 범위: 120 ~ 150
      </p>
      <p
        style={{
          fontSize: "11px",
          color: "#10b981",
          marginTop: "4px",
          marginBottom: "8px",
        }}
      >
        현재 속도: {label}
      </p>

      {/* y축 + 그래프 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr",
          columnGap: "6px",
          height: "150px",
        }}
      >
        {/* y축 레이블 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#9ca3af",
          }}
        >
          <span>{yMax}</span>
          <span>{yMid}</span>
          <span>0</span>
        </div>

        {/* 그래프 영역 */}
        <div
          style={{
            borderRadius: "18px",
            backgroundColor: "#f3f4f6",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
            }}
          >
            {bars.map((h, idx) => (
              <div
                key={idx}
                style={{
                  width: "12%",
                  height: `${h * 100}%`,
                  backgroundColor: "#10b981",
                  borderRadius: "8px",
                  opacity: 0.9,
                }}
              />
            ))}
          </div>

          {/* x축: 시간(초) */}
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#9ca3af",
            }}
          >
            {xLabels.map((t, idx) => (
              <span key={idx}>{t}s</span>
            ))}
          </div>
        </div>
      </div>

      {/* 아래 수치 요약 */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "11px",
          color: "#6b7280",
        }}
      >
        {value ? (
          <>
            <span>최소 약 {minWpm} WPM · </span>
            <span>평균 {value} WPM · </span>
            <span>최대 약 {maxWpm} WPM</span>
          </>
        ) : (
          <span>WPM 데이터를 계산하기에 충분한 길이가 아닙니다.</span>
        )}
      </div>
    </div>
  );
}

function VolumeChartBox({ rms, durationSec }) {
  const hasValue = typeof rms === "number";
  const avg = hasValue ? rms : null;

  const yTop = 0;
  const yBottom = -40;
  const yMid = -20;

  const totalSec = durationSec && durationSec > 0 ? durationSec : 10;
  const xMax = Math.max(10, Math.round(totalSec));
  const xLabels = [
    0,
    Math.round(xMax * 0.25),
    Math.round(xMax * 0.5),
    Math.round(xMax * 0.75),
    xMax,
  ];

  const display = hasValue ? avg.toFixed(1) : "측정 불가";

  let label = "데이터 부족";
  if (hasValue) {
    if (avg < -22) label = "조금 작은 편";
    else if (avg > -14) label = "조금 큰 편";
    else label = "적정 음량";
  }

  const norm = hasValue ? (avg - yBottom) / (yTop - yBottom) : 0.4;
  const barFactors = [0.4, 0.7, 0.3, 0.9, 0.5, 0.8];
  const bars = barFactors.map((f) =>
    Math.max(0.05, Math.min(norm * f, 1))
  );

  const minDb = hasValue ? (avg - 4).toFixed(1) : null;
  const maxDb = hasValue ? (avg + 4).toFixed(1) : null;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        padding: "16px 18px 18px",
      }}
    >
      <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
        음량 파형
      </p>
      <p style={{ fontSize: "12px", color: "#6b7280" }}>
        평균 음량:{" "}
        <strong style={{ color: "#111827" }}>{display} dBFS</strong>
      </p>
      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
        권장 범위: -18.0 ~ -12.0 dBFS
      </p>
      <p
        style={{
          fontSize: "11px",
          color: "#10b981",
          marginTop: "4px",
          marginBottom: "8px",
        }}
      >
        현재 음량: {label}
      </p>

      {/* y축 + 그래프 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr",
          columnGap: "6px",
          height: "150px",
        }}
      >
        {/* y축 레이블 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#9ca3af",
          }}
        >
          <span>{yTop}</span>
          <span>{yMid}</span>
          <span>{yBottom}</span>
        </div>

        {/* 그래프 영역 */}
        <div
          style={{
            borderRadius: "18px",
            backgroundColor: "#f3f4f6",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
            }}
          >
            {bars.map((h, idx) => (
              <div
                key={idx}
                style={{
                  width: "10%",
                  height: `${h * 100}%`,
                  backgroundColor: "#34d399",
                  borderRadius: "8px",
                  opacity: 0.9,
                }}
              />
            ))}
          </div>

          {/* x축: 시간(초) */}
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#9ca3af",
            }}
          >
            {xLabels.map((t, idx) => (
              <span key={idx}>{t}s</span>
            ))}
          </div>
        </div>
      </div>

      {/* 최소/평균/최대 요약 */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "11px",
          color: "#6b7280",
        }}
      >
        {hasValue ? (
          <>
            <span>최소 약 {minDb} dBFS · </span>
            <span>평균 {display} dBFS · </span>
            <span>최대 약 {maxDb} dBFS</span>
          </>
        ) : (
          <span>음량 데이터를 계산하기에 충분한 길이가 아닙니다.</span>
        )}
      </div>
    </div>
  );
}

function PitchChartBox({ f0r, durationSec }) {
  const hasValue = typeof f0r === "number" && !isNaN(f0r);
  const raw = hasValue ? f0r : null;

  const yMax = 24;
  const yMid = 12;
  const clamped =
    raw == null ? null : Math.max(0, Math.min(raw, yMax));
  const display =
    clamped == null ? "측정 불가" : clamped.toFixed(1);

  const isOutlier = raw != null && raw > yMax;

  const totalSec = durationSec && durationSec > 0 ? durationSec : 10;
  const xMax = Math.max(10, Math.round(totalSec));
  const xLabels = [
    0,
    Math.round(xMax * 0.25),
    Math.round(xMax * 0.5),
    Math.round(xMax * 0.75),
    xMax,
  ];

  const norm = clamped != null ? clamped / yMax : 0.4;
  const barFactors = [0.4, 0.9, 1.0, 0.8, 0.5];
  const bars = barFactors.map((f) =>
    Math.max(0.05, Math.min(norm * f, 1))
  );

  let label = "데이터 부족";
  if (clamped != null) {
    if (clamped < 4) label = "단조로운 편";
    else if (clamped > 10) label = "변화가 많은 편";
    else label = "적당한 피치 변화";
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        padding: "16px 18px 18px",
      }}
    >
      <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
        피치 분포
      </p>

      <p style={{ fontSize: "12px", color: "#6b7280" }}>
        피치 범위:{" "}
        <strong style={{ color: "#111827" }}>{display} semitone</strong>
      </p>

      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
        값이 클수록 고저 변화가 크고, 작을수록 단조롭게 들립니다.
      </p>

      {isOutlier && (
        <p
          style={{
            fontSize: "11px",
            color: "#f97316",
            marginTop: "2px",
          }}
        >
          ※ 원본 값이 매우 커서, 그래프는 최대 {yMax} semitone 기준으로
          표시했습니다.
        </p>
      )}

      <p
        style={{
          fontSize: "11px",
          color: "#10b981",
          marginTop: "4px",
          marginBottom: "8px",
        }}
      >
        현재 피치: {label}
      </p>

      {/* y축 + 그래프 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr",
          columnGap: "6px",
          height: "150px",
        }}
      >
        {/* y축 레이블 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#9ca3af",
          }}
        >
          <span>{yMax}</span>
          <span>{yMid}</span>
          <span>0</span>
        </div>

        {/* 그래프 영역 */}
        <div
          style={{
            borderRadius: "18px",
            backgroundColor: "#f3f4f6",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
            }}
          >
            {bars.map((h, idx) => (
              <div
                key={idx}
                style={{
                  width: "18px",
                  height: `${h * 100}%`,
                  backgroundColor: "#111827",
                  borderRadius: "6px",
                }}
              />
            ))}
          </div>

          {/* x축: 시간(초) */}
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#9ca3af",
            }}
          >
            {xLabels.map((t, idx) => (
              <span key={idx}>{t}s</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackBox({ feedbackLines }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        padding: "16px 18px 18px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
        개선 피드백
      </p>
      {feedbackLines && feedbackLines.length > 0 ? (
        <ul
          style={{
            fontSize: "12px",
            color: "#4b5563",
            paddingLeft: "18px",
            margin: 0,
          }}
        >
          {feedbackLines.map((line, idx) => (
            <li key={idx} style={{ marginBottom: "4px" }}>
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: "12px", color: "#9ca3af" }}>
          분석 결과를 바탕으로 한 피드백이 여기에 표시됩니다.
        </p>
      )}
    </div>
  );
}

/* ---------------------- 유틸 함수들 ---------------------- */

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDuration(sec) {
  if (!sec || sec <= 0) return "0초";
  if (sec < 60) return `${Math.round(sec)}초`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (s === 0) return `${m}분`;
  return `${m}분 ${s}초`;
}

function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

function makeSummarySentence(score) {
  if (score >= 90)
    return "전반적으로 매우 안정적인 발표입니다. 지금의 발표 패턴을 유지하면서 내용 완성도를 높여 보세요.";
  if (score >= 80)
    return "기본기가 잘 잡혀 있는 발표입니다. 속도와 음량을 조금만 더 다듬으면 더 좋은 발표가 될 수 있습니다.";
  if (score >= 70)
    return "발표의 흐름은 유지되고 있지만, 말 속도·음량·침묵 사용에서 개선 여지가 있습니다.";
  if (score >= 60)
    return "발표의 기본적인 구조는 있지만, 말하는 리듬과 전달 방식에서 여러 개선 포인트가 보입니다.";
  return "발표를 시작하는 단계로 보입니다. 간단한 스크립트로부터 천천히 발표 연습을 시작해 보세요.";
}

function makeFeedbackLines(m, s, segments = []) {
  if (!m || !s) return [];

  const lines = [];

  // ------------ 1) 전체 요약 피드백 ------------

  // ① 발화 속도 (전체)
  if (typeof m.sps === "number") {
    const approxWPM = Math.round(m.sps * 60 * 0.7);
    if (approxWPM > 150) {
      lines.push(
        "발화 속도가 전체적으로 다소 빠릅니다. 문장과 문장 사이에 1초 정도의 멈춤을 넣어 청중에게 생각할 시간을 주세요."
      );
    } else if (approxWPM < 110) {
      lines.push(
        "발화 속도가 전체적으로 다소 느립니다. 핵심 문장은 조금 더 경쾌한 속도로 말해보면 전달력이 좋아집니다."
      );
    } else {
      lines.push("발화 속도가 전체적으로 적절한 편입니다. 현재 속도를 유지해 보세요.");
    }
  }

  // ② 음량 (전체)
  if (typeof m.rms === "number") {
    if (m.rms < -22) {
      lines.push(
        "전체적인 음량이 조금 작은 편입니다. 강조하고 싶은 문장에서는 목소리를 한 단계만 더 키워 보세요."
      );
    } else if (m.rms > -14) {
      lines.push(
        "전체적인 음량이 다소 큰 편입니다. 문장 끝에서는 볼륨을 살짝 낮춰 주면 더 안정감 있게 들립니다."
      );
    } else {
      lines.push(
        "전체적인 음량이 적절한 범위입니다. 중요한 부분에서만 살짝 더 키우면 좋겠습니다."
      );
    }
  }

  // ③ 침묵 비율 (전체)
  if (typeof m.sil === "number") {
    if (m.sil < 5) {
      lines.push(
        "침묵(쉼)의 비율이 매우 낮습니다. 문단이 끝날 때 1초 정도 숨을 고르는 멈춤을 넣어주면 이야기가 더 또렷해집니다."
      );
    } else if (m.sil > 35) {
      lines.push(
        "침묵 비율이 높은 편입니다. 말이 끊기는 구간이 자주 느껴질 수 있으니, 불필요한 정적은 조금 줄여 보세요."
      );
    } else {
      lines.push(
        "침묵 사용이 전체적으로 적절합니다. 문장 사이의 여유가 있어 듣기 편한 편입니다."
      );
    }
  }

  // ④ 피치 범위 (전체)
  if (typeof m.f0r === "number") {
    if (m.f0r < 4) {
      lines.push(
        "피치(고저)의 변화가 적어서 다소 단조롭게 들릴 수 있습니다. 중요한 키워드를 말할 때는 톤을 살짝 올리거나 내려 변화를 줘 보세요."
      );
    } else if (m.f0r > 10) {
      lines.push(
        "피치 변화가 큰 편입니다. 에너지는 좋지만, 일부 구간에서는 톤이 급격하게 변하지 않도록 조금 더 안정적으로 조절해 보세요."
      );
    } else {
      lines.push(
        "피치 변화가 적당한 편이라 듣는 사람에게 자연스럽게 전달됩니다. 현재 톤을 기본으로 유지해 보세요."
      );
    }
  }

  // ------------ 2) 구간별 상세 피드백 ------------

  segments.forEach((seg) => {
    const { label, start, end, rms, sil } = seg;
    const rangeText = `${Math.round(start)}~${Math.round(end)}초`;

    // (1) 구간별 음량
    if (typeof rms === "number") {
      if (rms < -22) {
        lines.push(
          `${label} 구간(${rangeText}): 음량이 전반적으로 작습니다. 중요한 단어나 결론 부분에서는 목소리를 한 단계 더 키워 보세요.`
        );
      } else if (rms > -14) {
        lines.push(
          `${label} 구간(${rangeText}): 음량이 다소 큰 편입니다. 문장을 마무리할 때 살짝 볼륨을 낮추면 안정감이 생깁니다.`
        );
      }
    }

    // (2) 구간별 침묵 비율
    if (typeof sil === "number") {
      if (sil < 5) {
        lines.push(
          `${label} 구간(${rangeText}): 침묵이 거의 없어 호흡이 급해 보일 수 있습니다. 문장과 문단 사이에 짧은 멈춤을 의도적으로 넣어 보세요.`
        );
      } else if (sil > 35) {
        lines.push(
          `${label} 구간(${rangeText}): 침묵 비율이 높은 편입니다. 말이 끊기는 느낌을 줄이기 위해, 말할 내용을 미리 정리한 뒤 끊김 없는 문장을 연습해 보세요.`
        );
      }
    }
  });

  return lines;
}

export default App;
