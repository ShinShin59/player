import "./style.css";
import Fuse from "fuse.js";

interface Sound {
  name: string;
  path: string;
  letter: string;
}

const SOUNDS_PER_PAGE = 50;
const UNIDENTIFIED_LABEL = "Unidentified";
const UNIDENTIFIED_LETTER = "#";
let allSounds: Sound[] = [];
let fuse: Fuse<Sound> | null = null;
let currentAudio: HTMLAudioElement | null = null;
let playingPath: string | null = null;
const durationCache = new Map<string, number>();

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function loadDuration(path: string, onLoaded: (dur: number) => void) {
  if (durationCache.has(path)) {
    onLoaded(durationCache.get(path)!);
    return;
  }
  const audio = new Audio(`/${path}`);
  audio.addEventListener("loadedmetadata", () => {
    const dur = audio.duration;
    durationCache.set(path, dur);
    onLoaded(dur);
  });
  audio.addEventListener("error", () => onLoaded(NaN));
  audio.load();
}

async function loadSounds(): Promise<Sound[]> {
  const res = await fetch("/sounds.json");
  return res.json();
}

function getLetters(sounds: Sound[]): string[] {
  const letters = new Set<string>();
  sounds.forEach((s) => letters.add(s.letter));
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((l) => letters.has(l));
  const hasUnidentified = letters.has(UNIDENTIFIED_LETTER);
  return [...alpha, ...(hasUnidentified ? [UNIDENTIFIED_LABEL] : [])];
}

function updateDurationDisplay(path: string, current: number | null, total: number | null) {
  const container = document.querySelector<HTMLElement>(`.sound-duration[data-path="${path}"]`);
  if (!container) return;
  const currentEl = container.querySelector<HTMLSpanElement>(".duration-current");
  const totalEl = container.querySelector<HTMLSpanElement>(".duration-total");
  if (!totalEl) return;
  const totalStr = total != null && isFinite(total) ? formatDuration(total) : "--:--";
  totalEl.textContent = totalStr;
  if (currentEl) {
    currentEl.textContent =
      current != null && total != null && isFinite(total)
        ? `${formatDuration(current)} / `
        : "";
  }
}

function playStop(path: string, btn: HTMLButtonElement) {
  const url = `/${path}`;
  if (playingPath === path && currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    playingPath = null;
    btn.textContent = "Play";
    btn.classList.remove("playing");
    const total = durationCache.get(path);
    updateDurationDisplay(path, null, total ?? NaN);
    return;
  }
  if (currentAudio && playingPath) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    const prevTotal = durationCache.get(playingPath);
    updateDurationDisplay(playingPath, null, prevTotal ?? NaN);
  }
  currentAudio = new Audio(url);
  currentAudio.play();
  playingPath = path;
  btn.textContent = "Stop";
  btn.classList.add("playing");
  document.querySelectorAll(".btn-play.playing").forEach((el) => {
    if (el !== btn) {
      el.textContent = "Play";
      el.classList.remove("playing");
    }
  });
  const onTimeUpdate = () => {
    if (playingPath === path && currentAudio) {
      updateDurationDisplay(path, currentAudio.currentTime, currentAudio.duration);
    }
  };
  currentAudio.addEventListener("timeupdate", onTimeUpdate);
  currentAudio.addEventListener("loadedmetadata", () => {
    durationCache.set(path, currentAudio!.duration);
    updateDurationDisplay(path, 0, currentAudio!.duration);
  });
  currentAudio.onended = () => {
    if (playingPath === path) {
      btn.textContent = "Play";
      btn.classList.remove("playing");
      playingPath = null;
      const total = durationCache.get(path);
      updateDurationDisplay(path, null, total ?? NaN);
    }
  };
}

function download(path: string, name: string) {
  const a = document.createElement("a");
  a.href = `/${path}`;
  a.download = name + ".mp3";
  a.click();
}

function renderSound(sound: Sound): string {
  const isPlaying = playingPath === sound.path ? " playing" : "";
  const cached = durationCache.get(sound.path);
  const durDisplay = cached != null && isFinite(cached) ? formatDuration(cached) : "--:--";
  return `
    <div class="sound-row">
      <span class="sound-name" title="${sound.name}">${sound.name}</span>
      <div class="sound-actions">
        <span class="sound-duration" data-path="${sound.path}"><span class="duration-current"></span><span class="duration-total">${durDisplay}</span></span>
        <button class="btn-play${isPlaying}" data-path="${sound.path}" data-name="${sound.name}">Play</button>
        <button class="btn-download" data-path="${sound.path}" data-name="${sound.name}">Download</button>
      </div>
    </div>
  `;
}

function setupApp() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  let filteredSounds = allSounds;
  const availableLetters = () => getLetters(filteredSounds);
  let currentLetter = availableLetters()[0] ?? "";
  let letterPage = 0;

  function render() {
    const letterForFilter = currentLetter === UNIDENTIFIED_LABEL ? UNIDENTIFIED_LETTER : currentLetter;
    const soundsForLetter = currentLetter
      ? filteredSounds.filter((s) => s.letter === letterForFilter)
      : filteredSounds;
    const totalPages = Math.ceil(soundsForLetter.length / SOUNDS_PER_PAGE);
    const page = Math.min(letterPage, Math.max(0, totalPages - 1));
    const pageSounds = soundsForLetter.slice(
      page * SOUNDS_PER_PAGE,
      (page + 1) * SOUNDS_PER_PAGE
    );

    app.innerHTML = `
      <header class="header">
        <h1>D4X Sound Player</h1>
        <div class="search-wrap">
          <input type="text" id="search" placeholder="Search sounds (fuzzy)..." class="search-input" />
        </div>
      </header>

      <nav class="letter-nav">
        ${availableLetters()
          .map(
            (l) =>
              `<button class="letter-btn${l === currentLetter ? " active" : ""}" data-letter="${l}">${l}</button>`
          )
          .join("")}
      </nav>

      <main class="main">
        ${soundsForLetter.length === 0 ? `<p class="empty">No sounds found.</p>` : ""}
        ${soundsForLetter.length > 0 ? `
          <div class="letter-section">
            <h2 class="letter-title">${currentLetter === UNIDENTIFIED_LABEL ? UNIDENTIFIED_LABEL : `Letter "${currentLetter}"`} (${soundsForLetter.length} sounds)</h2>
            ${
              totalPages > 1
                ? `
              <div class="letter-pagination">
                ${Array.from({ length: totalPages }, (_, i) =>
                  `<button class="letter-page-btn${i === page ? " active" : ""}" data-letter-page="${i}">${i + 1}</button>`
                ).join("")}
              </div>
            `
                : ""
            }
            <div class="sounds-list">
              ${pageSounds.map(renderSound).join("")}
            </div>
          </div>
        ` : ""}
      </main>
    `;

    app.querySelectorAll(".btn-play").forEach((btn) => {
      btn.addEventListener("click", () => {
        const path = (btn as HTMLButtonElement).dataset.path!;
        playStop(path, btn as HTMLButtonElement);
      });
    });
    app.querySelectorAll(".btn-download").forEach((btn) => {
      btn.addEventListener("click", () => {
        const path = (btn as HTMLButtonElement).dataset.path!;
        const name = (btn as HTMLButtonElement).dataset.name!;
        download(path, name);
      });
    });
    app.querySelectorAll(".letter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentLetter = (btn as HTMLButtonElement).dataset.letter!;
        letterPage = 0;
        render();
      });
    });
    app.querySelectorAll(".letter-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        letterPage = parseInt((btn as HTMLButtonElement).dataset.letterPage ?? "0");
        render();
      });
    });

    pageSounds.forEach((s) => {
      if (!durationCache.has(s.path)) {
        loadDuration(s.path, (dur) => {
          durationCache.set(s.path, dur);
          const totalEl = app.querySelector<HTMLSpanElement>(`.sound-duration[data-path="${s.path}"] .duration-total`);
          if (totalEl && playingPath !== s.path) totalEl.textContent = formatDuration(dur);
        });
      }
    });

    const searchInput = app.querySelector<HTMLInputElement>("#search");
    if (searchInput) {
      searchInput.value = (app as any).__searchValue ?? "";
      searchInput.oninput = () => {
        (app as any).__searchValue = searchInput.value;
        const q = searchInput.value.trim();
        if (q) {
          const results = fuse!.search(q);
          filteredSounds = results.map((r) => r.item);
        } else {
          filteredSounds = allSounds;
        }
        const letters = availableLetters();
        currentLetter = letters.includes(currentLetter) ? currentLetter : letters[0] ?? UNIDENTIFIED_LABEL;
        letterPage = 0;
        render();
      };
    }
  }

  render();
}

loadSounds().then((sounds) => {
  allSounds = sounds;
  fuse = new Fuse(sounds, {
    keys: ["name"],
    threshold: 0.3,
  });
  setupApp();
});
