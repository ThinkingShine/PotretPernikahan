import { useState, useRef, useEffect } from "react"
import { Button } from "./components/Button"
import { Input } from "./components/Input"
import { BottomNav } from "./components/BottomNav"

type NavItem = "upload" | "gallery" | "guestbook"
type Step = "pick" | "review" | "done"
type FileStatus = "queued" | "uploading" | "done" | "error" | "rejected"

interface UploadFile {
  id: string
  name: string
  size: string
  sizeBytes: number
  thumb: string
  status: FileStatus
  progress: number
  errorMsg?: string
}

// Simulated file data for the demo
const DEMO_FILES: UploadFile[] = [
  {
    id: "f1",
    name: "IMG_2381.heic",
    size: "3,6 MB",
    sizeBytes: 3_600_000,
    thumb:
      "https://images.unsplash.com/photo-1596457221755-b96bc3a6df18?w=128&h=128&fit=crop&auto=format",
    status: "done",
    progress: 100,
  },
  {
    id: "f2",
    name: "IMG_2390.jpeg",
    size: "2,1 MB",
    sizeBytes: 2_100_000,
    thumb:
      "https://images.unsplash.com/photo-1519741196428-6a2175fa2557?w=128&h=128&fit=crop&auto=format",
    status: "uploading",
    progress: 60,
  },
  {
    id: "f3",
    name: "VID_2395.mp4",
    size: "48,2 MB",
    sizeBytes: 48_200_000,
    thumb:
      "https://images.unsplash.com/photo-1665960213508-48f07086d49c?w=128&h=128&fit=crop&auto=format",
    status: "error",
    progress: 33,
    errorMsg: "Gagal terkirim",
  },
  {
    id: "f4",
    name: "foto-resepsi-besar.jpeg",
    size: "31,4 MB",
    sizeBytes: 31_400_000,
    thumb:
      "https://images.unsplash.com/photo-1724280120520-c52b4c1170fd?w=128&h=128&fit=crop&auto=format",
    status: "rejected",
    progress: 0,
    errorMsg: "File terlalu besar. Maksimum 25 MB.",
  },
  {
    id: "f5",
    name: "IMG_2401.heic",
    size: "4,8 MB",
    sizeBytes: 4_800_000,
    thumb:
      "https://images.unsplash.com/photo-1721401870202-8e2264ecced2?w=128&h=128&fit=crop&auto=format",
    status: "queued",
    progress: 0,
  },
]

export default function UploadFlow() {
  const [step, setStep] = useState<Step>("pick")
  const [files, setFiles] = useState<UploadFile[]>(DEMO_FILES)
  const [guestName, setGuestName] = useState("")
  const [activeNav, setActiveNav] = useState<NavItem>("upload")
  const [offline, setOffline] = useState(true) // shown for demo
  const [dropHover, setDropHover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Global progress: average of all non-rejected files
  const uploadableFiles = files.filter(f => f.status !== "rejected")
  const globalProgress =
    uploadableFiles.length === 0
      ? 0
      : uploadableFiles.reduce((sum, f) => sum + f.progress, 0) /
        uploadableFiles.length

  // Simulate progress ticking on "uploading" files
  useEffect(() => {
    if (step !== "review") return
    const interval = setInterval(() => {
      setFiles(prev =>
        prev.map(f => {
          if (f.status === "uploading" && f.progress < 100) {
            const next = Math.min(f.progress + 3, 100)
            return { ...f, progress: next, status: next === 100 ? "done" : "uploading" }
          }
          if (f.status === "queued") {
            // Start queued files after a short delay feel
            const allUploading = prev.filter(x => x.status === "uploading")
            if (allUploading.length < 2) return { ...f, status: "uploading", progress: 2 }
          }
          return f
        })
      )
    }, 180)
    return () => clearInterval(interval)
  }, [step])

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function retryFile(id: string) {
    setFiles(prev =>
      prev.map(f =>
        f.id === id ? { ...f, status: "uploading", progress: 0, errorMsg: undefined } : f
      )
    )
  }

  const activeCount = files.filter(f => f.status !== "rejected").length

  return (
    <div
      style={{
        backgroundColor: "var(--color-canvas)",
        minHeight: "100dvh",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-ink-300)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px var(--space-screen-edge)",
            maxWidth: 680,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Back / logo */}
          <button
            aria-label="Kembali ke beranda"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--color-ink-700)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: "var(--text-h3-size)",
                fontWeight: "var(--text-h3-w)",
                color: "var(--color-ink-900)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {step === "pick" && "Bagikan Foto & Video"}
              {step === "review" && "Tinjau & Kirim"}
              {step === "done" && "Selesai"}
            </p>
            <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", margin: 0, lineHeight: 1.4 }}>
              Dinda & Arya · 12 Oktober 2026
            </p>
          </div>

          {/* Step indicator */}
          <StepDots step={step} />
        </div>

        {/* Global progress bar — 3px, only visible during upload */}
        <GlobalProgressBar progress={globalProgress} visible={step === "review" && globalProgress < 100} />
      </header>

      {/* ── Offline banner ── */}
      {offline && step === "review" && (
        <OfflineBanner onDismiss={() => setOffline(false)} />
      )}

      {/* ── Scrollable body ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px var(--space-screen-edge)",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 24px)",
          maxWidth: 680,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {step === "pick" && (
          <PickStep
            dropHover={dropHover}
            setDropHover={setDropHover}
            fileInputRef={fileInputRef}
            onPick={() => setStep("review")}
          />
        )}

        {step === "review" && (
          <ReviewStep
            files={files}
            guestName={guestName}
            setGuestName={setGuestName}
            onRemove={removeFile}
            onRetry={retryFile}
            activeCount={activeCount}
            onSubmit={() => setStep("done")}
          />
        )}

        {step === "done" && (
          <DoneStep
            count={activeCount}
            onUploadAgain={() => {
              setFiles(DEMO_FILES)
              setStep("pick")
            }}
            onGallery={() => {}}
          />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/heic,image/webp,video/mp4,video/quicktime,video/webm"
        style={{ display: "none" }}
        onChange={() => setStep("review")}
      />

      {/* ── Bottom nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <BottomNav active={activeNav} onChange={setActiveNav} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   STEP 1 — PICK
───────────────────────────────────────── */
function PickStep({
  dropHover,
  setDropHover,
  fileInputRef,
  onPick,
}: {
  dropHover: boolean
  setDropHover: (v: boolean) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onPick: () => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Area unggah — klik atau seret file ke sini"
        onDragOver={e => { e.preventDefault(); setDropHover(true) }}
        onDragLeave={() => setDropHover(false)}
        onDrop={e => { e.preventDefault(); setDropHover(false); onPick() }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dropHover ? "var(--color-primary-600)" : "var(--color-ink-300)"}`,
          borderRadius: "var(--radius-lg)",
          backgroundColor: dropHover ? "var(--color-primary-100)" : "var(--color-surface)",
          minHeight: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "28px 20px",
          cursor: "pointer",
          transition: "border-color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
          outline: "none",
          textAlign: "center",
        }}
        onFocus={e => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(154,106,79,.15)")}
        onBlur={e => (e.currentTarget.style.boxShadow = "none")}
      >
        {/* Camera icon 32px */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-full)",
            backgroundColor: dropHover ? "rgba(154,106,79,.15)" : "var(--color-primary-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color var(--duration-fast) var(--ease-standard)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>

        <div>
          <p style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", margin: "0 0 4px" }}>
            Bagikan Foto & Video
          </p>
          <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", margin: 0, lineHeight: "var(--text-caption-lh)" }}>
            JPG, PNG, HEIC, MP4 · maks 25 MB per foto, 200 MB per video
          </p>
        </div>
      </div>

      {/* CTA buttons */}
      <Button variant="primary" size="large" fullWidth icon={<GalleryIcon />} onClick={onPick}>
        Pilih dari Galeri
      </Button>
      <Button variant="secondary" size="large" fullWidth icon={<CameraIcon />} onClick={onPick}>
        Ambil Foto
      </Button>
    </div>
  )
}

/* ─────────────────────────────────────────
   STEP 2 — REVIEW
───────────────────────────────────────── */
function ReviewStep({
  files,
  guestName,
  setGuestName,
  onRemove,
  onRetry,
  activeCount,
  onSubmit,
}: {
  files: UploadFile[]
  guestName: string
  setGuestName: (v: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  activeCount: number
  onSubmit: () => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* File list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {files.map((file, idx) => (
          <FileRow
            key={file.id}
            file={file}
            isLast={idx === files.length - 1}
            onRemove={() => onRemove(file.id)}
            onRetry={() => onRetry(file.id)}
          />
        ))}
      </div>

      {/* Name input */}
      <div style={{ padding: "0 0 4px" }}>
        <Input
          label="Nama Anda"
          placeholder="Contoh: Pak Hendra"
          helper="Boleh dikosongkan — foto tetap terkirim"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
        />
      </div>

      {/* Submit */}
      <Button variant="primary" size="large" fullWidth onClick={onSubmit}>
        Kirim {activeCount} File
      </Button>
    </div>
  )
}

function FileRow({
  file,
  isLast,
  onRemove,
  onRetry,
}: {
  file: UploadFile
  isLast: boolean
  onRemove: () => void
  onRetry: () => void
}) {
  const isRejected = file.status === "rejected"
  const isError = file.status === "error"
  const isDone = file.status === "done"

  const rowBg = isRejected || isError ? "rgba(168,56,47,.03)" : "var(--color-surface)"
  const borderColor = isRejected || isError ? "rgba(168,56,47,.15)" : "var(--color-ink-100)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: isLast ? "none" : `1px solid ${borderColor}`,
        backgroundColor: rowBg,
        transition: "background-color var(--duration-fast) var(--ease-standard)",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "var(--color-ink-100)",
          position: "relative",
        }}
      >
        <img
          src={file.thumb}
          alt={`Pratinjau ${file.name}`}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: isRejected ? 0.45 : 1,
          }}
        />
        {isDone && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(63,125,87,.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Info + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + size row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: "var(--text-body-size)",
              fontWeight: 500,
              color: isRejected || isError ? "var(--color-danger)" : "var(--color-ink-900)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "58%",
            }}
          >
            {file.name}
          </span>
          <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", flexShrink: 0 }}>
            {file.size}
          </span>
        </div>

        {/* Progress bar */}
        {!isRejected && (
          <div
            style={{
              height: 4,
              backgroundColor: "var(--color-ink-100)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
              marginBottom: isError || isDone ? 4 : 0,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${file.progress}%`,
                backgroundColor:
                  isError ? "var(--color-danger)" :
                  isDone ? "var(--color-success)" :
                  "var(--color-primary-600)",
                borderRadius: "var(--radius-full)",
                transition: "width var(--duration-base) var(--ease-standard)",
              }}
            />
          </div>
        )}

        {/* Error / rejected message */}
        {(isError || isRejected) && (
          <p
            style={{
              fontSize: "var(--text-caption-size)",
              color: "var(--color-danger)",
              margin: 0,
              lineHeight: "var(--text-caption-lh)",
            }}
          >
            {file.errorMsg}
          </p>
        )}

        {/* Rejected: format hint */}
        {isRejected && (
          <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", margin: "2px 0 0" }}>
            Coba kompres file sebelum mengunggah.
          </p>
        )}
      </div>

      {/* Action button */}
      <div style={{ flexShrink: 0 }}>
        {isError && (
          <button
            onClick={onRetry}
            style={{
              fontSize: "var(--text-caption-size)",
              fontWeight: 600,
              color: "var(--color-primary-600)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 8px",
              fontFamily: "var(--font-body)",
              borderRadius: "var(--radius-sm)",
              minWidth: 48,
              minHeight: 48,
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-primary-100)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Coba Lagi
          </button>
        )}
        {(file.status === "queued" || file.status === "uploading" || isRejected) && (
          <button
            onClick={onRemove}
            aria-label={`Hapus ${file.name}`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-400)",
              padding: 8,
              minWidth: 48,
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-sm)",
              transition: "color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--color-danger)"
              e.currentTarget.style.backgroundColor = "rgba(168,56,47,.06)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--color-ink-400)"
              e.currentTarget.style.backgroundColor = "transparent"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   STEP 3 — DONE
───────────────────────────────────────── */
function DoneStep({
  count,
  onUploadAgain,
  onGallery,
}: {
  count: number
  onUploadAgain: () => void
  onGallery: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 0 24px",
        gap: 0,
      }}
    >
      {/* Success icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "var(--radius-full)",
          backgroundColor: "rgba(63,125,87,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: "var(--text-h1-size)",
          lineHeight: "var(--text-h1-lh)",
          fontWeight: "var(--text-h1-w)",
          color: "var(--color-ink-900)",
          margin: "0 0 8px",
        }}
      >
        Terkirim. Terima kasih!
      </h1>
      <p
        style={{
          fontSize: "var(--text-body-lg-size)",
          lineHeight: "var(--text-body-lg-lh)",
          color: "var(--color-ink-500)",
          margin: "0 0 40px",
        }}
      >
        {count} file berhasil dibagikan
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <Button variant="primary" size="large" fullWidth icon={<UploadIcon />} onClick={onUploadAgain}>
          Unggah Lagi
        </Button>
        <Button variant="secondary" size="large" fullWidth icon={<GalleryIcon />} onClick={onGallery}>
          Lihat Galeri
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   UTILITY COMPONENTS
───────────────────────────────────────── */

function GlobalProgressBar({ progress, visible }: { progress: number; visible: boolean }) {
  return (
    <div
      style={{
        height: 3,
        backgroundColor: "var(--color-ink-100)",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: "opacity var(--duration-base) var(--ease-standard)",
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progres unggahan"
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "var(--color-primary-600)",
          borderRadius: "var(--radius-full)",
          transition: "width var(--duration-base) var(--ease-standard)",
        }}
      />
    </div>
  )
}

function OfflineBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px var(--space-screen-edge)",
        backgroundColor: "rgba(176,118,28,.08)",
        borderBottom: "1px solid rgba(176,118,28,.22)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M1 6s4-2 11-2 11 2 11 2" />
        <path d="M5 10s2.5-1.5 7-1.5 7 1.5 7 1.5" />
        <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="2.5" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
      <p
        style={{
          flex: 1,
          fontSize: "var(--text-caption-size)",
          color: "var(--color-warning)",
          margin: 0,
          lineHeight: "var(--text-caption-lh)",
          fontWeight: 500,
        }}
      >
        Koneksi terputus. Unggahan akan dilanjutkan otomatis.
      </p>
      <button
        onClick={onDismiss}
        aria-label="Tutup pemberitahuan"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-warning)",
          padding: 4,
          display: "flex",
          alignItems: "center",
          minWidth: 32,
          minHeight: 32,
          justifyContent: "center",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

function StepDots({ step }: { step: Step }) {
  const steps: Step[] = ["pick", "review", "done"]
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }} aria-hidden="true">
      {steps.map(s => (
        <div
          key={s}
          style={{
            width: s === step ? 20 : 6,
            height: 6,
            borderRadius: "var(--radius-full)",
            backgroundColor: s === step ? "var(--color-primary-600)" : "var(--color-ink-300)",
            transition: "width var(--duration-base) var(--ease-standard), background-color var(--duration-base) var(--ease-standard)",
          }}
        />
      ))}
    </div>
  )
}

/* ── Icons ── */
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
