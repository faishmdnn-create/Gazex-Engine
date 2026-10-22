import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, configIsPlaceholder } from "./firebase.js";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const $ = (id) => document.getElementById(id);
const state = { tool: "repack", user: null, originalUrl: null, originalFile: null, resultUrl: null, resultMimeType: null, processing: false };
const copy = {
  id: {
    loginGoogle:"Login dengan Google",logout:"Keluar",eyebrow:"VIDEO ENHANCEMENT STUDIO",
    heroLine1:"Tingkatkan kualitas",heroLine2:"video kamu.",heroDesc:"Satu studio untuk optimasi video, konversi frame rate, dan peningkatan warna.",
    demoNotice:"Mesin video berjalan di browser perangkatmu. File video tidak diunggah ke server GAZEX.",
    account:"AKUN",loginRequired:"Login diperlukan",loginMessage:"Login dengan Google untuk menghubungkan akunmu.",
    trialPending:"Trial: menunggu login",toolsKicker:"TOOLS",chooseTool:"Pilih video tool",localNote:"Video diproses di perangkatmu",
    repackDesc:"Konversi MP4 dan optimasi hingga 1080p",fpsDesc:"Ubah output menjadi 60, 90, atau 120 FPS",hdrDesc:"Peningkatan kontras dan warna (SDR)",
    workspace:"WORKSPACE",engineNotConnected:"ENGINE SIAP DIMUAT",chooseVideo:"Pilih video dari perangkat",
    fileTypes:"MP4, MOV, WebM, dan format yang didukung FFmpeg",processVideo:"Proses video",waitingEngine:"Menyiapkan mesin pemrosesan",
    backendRequired:"Pemrosesan dilakukan lokal di browser. Unduhan mesin pertama kali sekitar 30 MB.",preview:"PREVIEW",beforeAfter:"Before / After",
    originalVideo:"VIDEO ASLI",processedVideo:"VIDEO HASIL",resultPlaceholder:"Hasil akan muncul setelah video selesai diproses.",
    videoDetails:"Detail video",property:"Properti",original:"Asli",result:"Hasil",format:"Format",resolution:"Resolusi",
    size:"Ukuran file",duration:"Durasi",metadataNote:"Informasi hasil diisi dari file yang benar-benar diproses. FPS sumber tidak selalu dapat dibaca browser.",
    saveVideo:"Simpan gazexical.mp4",shareTikTok:"Lanjut ke TikTok",footerNote:"Pemrosesan memakai sumber daya browser; video besar mungkin lambat atau gagal di HP."
  },
  en: {
    loginGoogle:"Sign in with Google",logout:"Sign out",eyebrow:"VIDEO ENHANCEMENT STUDIO",
    heroLine1:"Upgrade your",heroLine2:"video experience.",heroDesc:"One studio for video optimization, frame-rate conversion, and color enhancement.",
    demoNotice:"The video engine runs in your browser. Video files are not uploaded to GAZEX servers.",
    account:"ACCOUNT",loginRequired:"Sign-in required",loginMessage:"Sign in with Google to connect your account.",
    trialPending:"Trial: waiting for sign-in",toolsKicker:"TOOLS",chooseTool:"Choose a video tool",localNote:"Video is processed on your device",
    repackDesc:"MP4 conversion and optimization up to 1080p",fpsDesc:"Convert output to 60, 90, or 120 FPS",hdrDesc:"Contrast and color enhancement (SDR)",
    workspace:"WORKSPACE",engineNotConnected:"ENGINE READY TO LOAD",chooseVideo:"Choose a video from your device",
    fileTypes:"MP4, MOV, WebM, and formats supported by FFmpeg",processVideo:"Process video",waitingEngine:"Preparing processing engine",
    backendRequired:"Processing runs locally in the browser. The first engine download is about 30 MB.",preview:"PREVIEW",beforeAfter:"Before / After",
    originalVideo:"ORIGINAL VIDEO",processedVideo:"PROCESSED VIDEO",resultPlaceholder:"The result will appear after processing completes.",
    videoDetails:"Video details",property:"Property",original:"Original",result:"Result",format:"Format",resolution:"Resolution",
    size:"File size",duration:"Duration",metadataNote:"Result details are read from the processed file. Browsers cannot always read source FPS.",
    saveVideo:"Save gazexical.mp4",shareTikTok:"Continue to TikTok",footerNote:"Processing uses browser resources; large videos may be slow or fail on phones."
  }
};

function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (copy[lang][key]) el.textContent = copy[lang][key];
  });
}
$("languageSelect").addEventListener("change", e => setLanguage(e.target.value));

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 3600)).padStart(2,"0")}:${String(Math.floor((s % 3600) / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
}
function getFormat(file) {
  const ext = file.name.includes(".") ? file.name.split(".").pop().toUpperCase() : "";
  return ext || file.type || "Tidak diketahui";
}
function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll(".tool-card").forEach(card => card.classList.toggle("active", card.dataset.tool === tool));
  $("selectedToolTitle").textContent = ({repack:"Repack HD",fps:"FPS Converter",hdr:"HDR Enhance (SDR)"})[tool];
  $("fpsSelect").classList.toggle("hidden", tool !== "fps");
  $("fpsLabel").classList.toggle("hidden", tool !== "fps");
  $("processBtn").disabled = !state.originalFile || state.processing;
  if (!state.processing) $("progressPanel").classList.add("hidden");
}
document.querySelectorAll(".tool-card").forEach(card => card.addEventListener("click", () => setTool(card.dataset.tool)));

const ffmpeg = new FFmpeg();
let ffmpegReady = false;
let ffmpegLoadPromise = null;
async function ensureFFmpeg() {
  if (ffmpegReady) return;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
      });
      ffmpegReady = true;
    })().catch(error => { ffmpegLoadPromise = null; throw error; });
  }
  await ffmpegLoadPromise;
}

function showProgress(title, message, busy = false) {
  $("progressPanel").classList.remove("hidden");
  $("progressPanel").classList.toggle("processing", busy);
  $("progressTitle").textContent = title;
  $("progressPercent").textContent = busy ? "Berjalan…" : "—";
  $("progressBar").style.width = busy ? "35%" : "0%";
  $("progressMessage").textContent = message;
}

$("videoInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    alert("Pilih file video yang didukung perangkat.");
    event.target.value = "";
    return;
  }
  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.originalFile = file;
  state.originalUrl = URL.createObjectURL(file);
  state.resultUrl = null;
  state.resultMimeType = null;
  $("originalPreview").src = state.originalUrl;
  $("previewPanel").classList.remove("hidden");
  $("fileInfo").classList.remove("hidden");
  $("fileInfo").textContent = `${file.name} · ${formatBytes(file.size)} · ${file.type || "tipe tidak diketahui"}`;
  $("originalFormat").textContent = getFormat(file);
  $("originalSize").textContent = formatBytes(file.size);
  $("resultFormat").textContent = "—";
  $("resultResolution").textContent = "—";
  $("resultFps").textContent = "—";
  $("resultSize").textContent = "—";
  $("resultDuration").textContent = "—";
  $("resultPreview").classList.add("hidden");
  $("resultPreview").removeAttribute("src");
  document.querySelector(".empty-result").classList.remove("hidden");
  $("downloadBtn").disabled = true;
  $("tiktokBtn").disabled = true;
  $("processBtn").disabled = false;
  $("progressPanel").classList.add("hidden");

  const video = $("originalPreview");
  await new Promise(resolve => {
    if (video.readyState >= 1) return resolve();
    video.addEventListener("loadedmetadata", resolve, { once: true });
    video.addEventListener("error", resolve, { once: true });
  });
  $("originalResolution").textContent = video.videoWidth && video.videoHeight ? `${video.videoWidth} × ${video.videoHeight}` : "—";
  $("originalDuration").textContent = formatDuration(video.duration);
  $("originalFps").textContent = "Tidak tersedia di browser";
});

$("processBtn").addEventListener("click", async () => {
  if (!state.user) {
    alert("Login dengan Google dulu untuk melanjutkan. Login yang ada tidak perlu diubah.");
    return;
  }
  if (!state.originalFile) {
    alert("Pilih file video terlebih dahulu.");
    return;
  }
  if (state.processing) return;
  if (state.originalFile.size > 100 * 1024 * 1024) {
    alert("Untuk tahap awal di browser HP, pilih video di bawah 100 MB agar risiko kehabisan memori lebih kecil.");
    return;
  }

  state.processing = true;
  $("processBtn").disabled = true;
  showProgress("Menyiapkan mesin video…", "Pertama kali, browser mengunduh mesin FFmpeg sekitar 30 MB. Pastikan koneksi internet stabil.", true);
  let inputName = "input_video";
  const outputName = "gazexical.mp4";
  try {
    await ensureFFmpeg();
    showProgress("Memproses video…", "FFmpeg sedang memproses file di perangkat ini. Jangan tutup atau muat ulang halaman.", true);
    const extension = (state.originalFile.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
    inputName = `input_video.${extension || "mp4"}`;
    try { await ffmpeg.deleteFile(inputName); } catch (_) {}
    try { await ffmpeg.deleteFile(outputName); } catch (_) {}
    await ffmpeg.writeFile(inputName, new Uint8Array(await state.originalFile.arrayBuffer()));

    const args = ["-i", inputName, "-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
    if (state.tool === "repack") {
      args.push("-vf", "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2");
    } else if (state.tool === "fps") {
      const targetFps = Number($("fpsSelect").value);
      if (![60, 90, 120].includes(targetFps)) throw new Error("Target FPS tidak valid.");
      args.push("-vf", `fps=${targetFps}`);
    } else if (state.tool === "hdr") {
      // SDR color enhancement only; do not claim native HDR mastering.
      args.push("-vf", "eq=contrast=1.12:brightness=0.02:saturation=1.18,format=yuv420p");
    }
    args.push(outputName);
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) throw new Error(`FFmpeg berhenti dengan kode ${exitCode}.`);
    const outputData = await ffmpeg.readFile(outputName);
    if (!outputData || typeof outputData === "string" || outputData.length === 0) throw new Error("File hasil kosong atau tidak ditemukan.");

    const blob = new Blob([outputData], { type: "video/mp4" });
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
    state.resultUrl = URL.createObjectURL(blob);
    state.resultMimeType = "video/mp4";
    const resultVideo = $("resultPreview");
    resultVideo.src = state.resultUrl;
    resultVideo.classList.remove("hidden");
    document.querySelector(".empty-result").classList.add("hidden");
    await new Promise((resolve, reject) => {
      if (resultVideo.readyState >= 1) return resolve();
      resultVideo.addEventListener("loadedmetadata", resolve, { once: true });
      resultVideo.addEventListener("error", () => reject(new Error("File selesai dibuat, tetapi browser tidak dapat membuka preview hasil.")), { once: true });
      resultVideo.load();
    });
    $("resultFormat").textContent = "MP4 (H.264)";
    $("resultResolution").textContent = resultVideo.videoWidth && resultVideo.videoHeight ? `${resultVideo.videoWidth} × ${resultVideo.videoHeight}` : "—";
    $("resultFps").textContent = state.tool === "fps" ? `${$("fpsSelect").value} FPS (frame duplikasi/drop; bukan interpolasi AI)` : "Tidak tersedia";
    $("resultSize").textContent = formatBytes(blob.size);
    $("resultDuration").textContent = formatDuration(resultVideo.duration);
    $("downloadBtn").disabled = false;
    $("tiktokBtn").disabled = false;
    $("progressPanel").classList.remove("processing");
    $("progressTitle").textContent = "Pemrosesan selesai";
    $("progressPercent").textContent = "Selesai";
    $("progressBar").style.width = "100%";
    const notes = {
      repack: "File MP4 hasil transcode sudah dibuat. Video kecil tidak otomatis di-upscale; batas output maksimal 1080p.",
      fps: "Output FPS diubah dengan pengaturan frame rate FFmpeg. Ini bukan interpolasi gerakan AI, sehingga gerakan mungkin tidak menjadi lebih halus.",
      hdr: "Peningkatan kontras dan saturasi selesai dalam SDR. Ini bukan mastering HDR asli atau penambahan metadata HDR.",
    };
    $("progressMessage").textContent = notes[state.tool];
  } catch (error) {
    console.error("GAZEX video processing error:", error);
    $("progressPanel").classList.remove("processing");
    $("progressTitle").textContent = "Pemrosesan gagal";
    $("progressPercent").textContent = "Gagal";
    $("progressBar").style.width = "0%";
    $("progressMessage").textContent = `${error?.message || "Terjadi kesalahan saat memproses video."} Coba video lebih pendek/kecil atau periksa koneksi internet.`;
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch (_) {}
    state.processing = false;
    $("processBtn").disabled = !state.originalFile;
  }
});

$("downloadBtn").addEventListener("click", () => {
  if (!state.resultUrl) return;
  const a = document.createElement("a");
  a.href = state.resultUrl;
  a.download = "gazexical.mp4";
  document.body.appendChild(a);
  a.click();
  a.remove();
});
$("tiktokBtn").addEventListener("click", () => {
  alert("Video hasil sudah tersimpan di perangkat setelah tombol Simpan ditekan. Unggah melalui aplikasi TikTok; unggah otomatis membutuhkan integrasi resmi TikTok.");
  window.open("https://www.tiktok.com/upload", "_blank", "noopener,noreferrer");
});

// Google Authentication flow is intentionally preserved.
$("signInBtn").addEventListener("click", async () => {
  if (configIsPlaceholder || !auth || !provider) {
    alert("Isi firebaseConfig di firebase.js dengan konfigurasi dari Firebase Console, lalu deploy ulang.");
    return;
  }
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    alert(`Login gagal: ${error.code || error.message}. Periksa Authorized domains dan konfigurasi Firebase.`);
  }
});
$("signOutBtn").addEventListener("click", async () => {
  if (auth) await signOut(auth);
});

if (auth) {
  onAuthStateChanged(auth, user => {
    state.user = user;
    $("signInBtn").classList.toggle("hidden", !!user);
    $("signOutBtn").classList.toggle("hidden", !user);
    $("accountTitle").textContent = user ? (user.displayName || "Pengguna GAZEX") : "Login diperlukan";
    $("accountMessage").textContent = user ? (user.email || "Akun Google terhubung") : "Login dengan Google untuk menghubungkan akunmu.";
    $("trialLabel").textContent = user ? "Trial: belum diaktifkan backend" : "Trial: menunggu login";
  });
} else {
  $("accountMessage").textContent = "Isi firebaseConfig di firebase.js untuk mengaktifkan login Google.";
}

setLanguage("id");
setTool("repack");
