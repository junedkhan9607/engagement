document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("bg-video");
    const videoOverlay = document.getElementById("video-overlay");
    const heroContent = document.getElementById("hero-content");
    const loader = document.getElementById("loader");
    const barFill = document.getElementById("loaderBarFill");
    const percentText = document.getElementById("loaderPercent");

    let loadComplete = false;   // buffering finished, first frame ready to show
    let isPlaying = false;      // user has interacted, video is playing
    let textTriggered = false;  // end-of-video text reveal
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ===========================================
       1. TRUE VIEWPORT HEIGHT FIX (old iOS/Android)
       =========================================== */
    function setViewportHeight() {
        document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    }
    setViewportHeight();
    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);

    /* ===========================================
       2. PROGRESS BAR — reflects real buffered %
       =========================================== */
    function setPercent(p) {
        const clamped = Math.max(0, Math.min(100, Math.round(p)));
        if (barFill) barFill.style.width = clamped + "%";
        if (percentText) percentText.textContent = clamped + "%";
        return clamped;
    }

    function updateProgress() {
        if (loadComplete) return;
        if (!video.duration || isNaN(video.duration) || !video.buffered.length) return;

        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const percent = setPercent((bufferedEnd / video.duration) * 100);

        if (percent >= 100) markLoadComplete();
    }

    function markLoadComplete() {
        if (loadComplete) return;
        loadComplete = true;
        setPercent(100);
        // brief pause at 100% so the bar visibly "completes" before revealing
        setTimeout(showFirstFrame, 350);
    }

    /* ===========================================
       3. SHOW STATIC FIRST FRAME (video stays paused
          here — it does NOT auto-play). Loader fades
          out, video fades in showing frame 0, and we
          start listening for the user's first touch.
       =========================================== */
    function showFirstFrame() {
        video.pause();
        try { video.currentTime = 0; } catch (e) { /* some browsers throw before seekable */ }
        // No opacity/class trick on the video itself — it behaves exactly like
        // the original code (browser shows frame 0 naturally once buffered).
        // The opaque loader sitting on top is what's hiding it until now.
        if (loader) loader.classList.add("hide");

        // Now — and only now — start listening for interaction to play.
        interactionEvents.forEach(evt => {
            window.addEventListener(evt, startVideo, { passive: true });
        });
    }

    /* ===========================================
       4. START PLAYBACK — only on user's first
          touch / scroll / swipe / click / key etc.
       =========================================== */
    const interactionEvents = [
        "touchstart",
        "touchend",
        "touchmove",
        "click",
        "pointerdown",
        "wheel",
        "keydown"
    ];

    function startVideo() {
        if (isPlaying || !loadComplete) return;
        video.muted = true;

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                removeInteractionListeners();
            }).catch(err => {
                console.log("Play interrupted:", err);
                // Listeners stay active, will retry on the next interaction.
            });
        }
    }

    function removeInteractionListeners() {
        interactionEvents.forEach(evt => {
            window.removeEventListener(evt, startVideo);
        });
    }

    /* ===========================================
       5. TEXT REVEAL near end of video
       =========================================== */
    function revealText() {
        if (textTriggered) return;
        textTriggered = true;
        videoOverlay.classList.add("darken");
        if (!prefersReducedMotion) {
            video.classList.add("blur-effect");
        }
        heroContent.classList.add("show-text");
    }

    /* ===========================================
       6. WIRE UP BUFFERING EVENTS
       =========================================== */
    video.addEventListener("loadedmetadata", updateProgress);
    video.addEventListener("progress", updateProgress);

    // Browser's own signal that it can play through without stalling —
    // treat as "fully loaded" too, since buffered ranges don't always hit
    // an exact 100 on every browser.
    video.addEventListener("canplaythrough", markLoadComplete, { once: true });

    video.addEventListener("timeupdate", () => {
        if (!video.duration || isNaN(video.duration)) return;
        const timeRemaining = video.duration - video.currentTime;
        if (timeRemaining <= 4) revealText();
    });

    video.addEventListener("ended", () => {
        video.pause();
    });

    /* ===========================================
       7. FAILSAFES — never let the user get stuck
       =========================================== */
    video.addEventListener("error", () => {
        // Video failed outright — skip straight to the text so the page
        // still works, just without the background motion.
        markLoadComplete();
        revealText();
    });

    // If buffering stalls indefinitely (slow network, data-saver mode, etc.)
    // don't trap the user on the loading screen forever.
    setTimeout(() => {
        if (!loadComplete) markLoadComplete();
    }, 15000);
});