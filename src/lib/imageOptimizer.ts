/**
 * Client-Side Image Optimizer & HEIC Converter.
 *
 * Provides:
 * - Automatic HEIC/HEIF to standard JPEG conversion for iPhone photos
 * - Smart canvas downscaling to max 2048px (2K HD)
 * - Visual-lossless JPEG compression at 0.82 quality
 * - EXIF orientation preservation via createImageBitmap
 * - Zero server overhead & 85-90% bandwidth reduction
 */

export interface CompressionOptions {
  maxDimension?: number // Maximum width/height in px (default 2048)
  quality?: number // JPEG compression quality 0.0 - 1.0 (default 0.82)
  outputType?: "image/jpeg" | "image/webp"
}

const DEFAULT_OPTIONS: Required<Omit<CompressionOptions, "outputType">> & {
  outputType: "image/jpeg"
} = {
  maxDimension: 2048,
  quality: 0.82,
  outputType: "image/jpeg",
}

/**
 * Checks if a file is an Apple HEIC/HEIF photo.
 */
export function isHeic(file: File): boolean {
  const type = file.type?.toLowerCase() || ""
  const name = file.name?.toLowerCase() || ""
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  )
}

/**
 * Converts an Apple HEIC/HEIF file to standard JPEG using client-side decoding.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeic(file)) return file

  try {
    const heic2anyModule = await import("heic2any")
    const heic2any = (heic2anyModule as any).default || heic2anyModule
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    })

    const blob = Array.isArray(result) ? result[0] : result
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg")
    return new File([blob], newName, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    })
  } catch (err) {
    console.warn("HEIC conversion fallback:", err)
    return file
  }
}

/**
 * Computes new dimensions that fit within maxDimension while maintaining aspect ratio.
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  if (width > height) {
    const newWidth = maxDimension
    const newHeight = Math.round((height * maxDimension) / width)
    return { width: newWidth, height: newHeight }
  } else {
    const newHeight = maxDimension
    const newWidth = Math.round((width * maxDimension) / height)
    return { width: newWidth, height: newHeight }
  }
}

/**
 * Renders an image to canvas using createImageBitmap (with EXIF auto-orientation).
 */
async function drawToCanvas(
  file: File,
  maxDimension: number,
): Promise<HTMLCanvasElement> {
  // Method A: modern createImageBitmap with EXIF orientation
  if (typeof window.createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      })
      const { width, height } = calculateDimensions(
        bitmap.width,
        bitmap.height,
        maxDimension,
      )

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas 2d context")

      // High quality smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()
      return canvas
    } catch {
      // Fallback to Image element below if createImageBitmap fails
    }
  }

  // Method B: standard HTMLImageElement fallback
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = calculateDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        maxDimension,
      )

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas 2d context"))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Gagal membaca gambar untuk dikompresi."))
    }
    img.src = url
  })
}

/**
 * Optimizes an image file by resizing and compressing before upload.
 * If file is HEIC, it will automatically be converted to standard JPEG.
 * If file is a video, GIF, or unsupported type, it returns the original file untouched.
 */
export async function optimizeImage(
  file: File,
  options?: CompressionOptions,
): Promise<File> {
  // 1. Skip non-images (videos, audio, pdf)
  if (file.type && !file.type.startsWith("image/") && !isHeic(file)) {
    return file
  }

  // 2. Skip animated GIFs and vector SVGs
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return file
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    // 3. Convert Apple HEIC to standard JPEG if necessary
    let sourceFile = file
    if (isHeic(file)) {
      sourceFile = await convertHeicToJpeg(file)
    }

    // 4. Render to canvas with calculated bounds
    const canvas = await drawToCanvas(sourceFile, opts.maxDimension)

    // 5. Export canvas as compressed JPEG blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        opts.outputType || "image/jpeg",
        opts.quality,
      )
    })

    if (!blob) return sourceFile

    // 6. Ensure proper filename extension (.jpg)
    const baseName = sourceFile.name.replace(/\.[a-zA-Z0-9]+$/, "")
    const outputExtension = opts.outputType === "image/webp" ? ".webp" : ".jpg"
    const newFilename = `${baseName}${outputExtension}`

    // If compressed size is somehow larger than original (rare), keep original
    if (blob.size >= sourceFile.size && sourceFile.type === "image/jpeg") {
      return sourceFile
    }

    return new File([blob], newFilename, {
      type: opts.outputType || "image/jpeg",
      lastModified: Date.now(),
    })
  } catch (err) {
    console.warn("Optimasi gambar gagal, mengunggah berkas asli:", err)
    return file
  }
}
