document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("bg-video");
    const videoOverlay = document.getElementById("video-overlay");
    const heroContent = document.getElementById("hero-content");
    const loader = document.getElementById("loader");
    const barFill = document.getElementById("loaderBarFill");
    const percentText = document.getElementById("loaderPercent");

    let loadComplete = false;
    let isPlaying = false;
    let textTriggered = false;
    let firstFrameReady = false;

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    /* =====================================================
       1. VIEWPORT HEIGHT — iOS + ANDROID
       ===================================================== */

    function setViewportHeight() {
        document.documentElement.style.setProperty(
            "--vh",
            `${window.innerHeight * 0.01}px`
        );
    }

    setViewportHeight();

    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);


    /* =====================================================
       2. PROGRESS BAR
       ===================================================== */

    function setPercent(percent) {
        const value = Math.max(
            0,
            Math.min(100, Math.round(percent))
        );

        if (barFill) {
            barFill.style.width = value + "%";
        }

        if (percentText) {
            percentText.textContent = value + "%";
        }

        return value;
    }


    /* =====================================================
       3. UPDATE REAL VIDEO BUFFER
       ===================================================== */

    function updateProgress() {

        if (loadComplete) return;

        if (
            !video.duration ||
            !isFinite(video.duration) ||
            !video.buffered ||
            !video.buffered.length
        ) {
            return;
        }

        try {
            const bufferedEnd =
                video.buffered.end(video.buffered.length - 1);

            const percent =
                (bufferedEnd / video.duration) * 100;

            setPercent(percent);

            /*
             * Don't wait for an exact 100%.
             * If the browser has enough data to play,
             * mark it ready.
             */
            if (percent >= 95) {
                prepareVideo();
            }

        } catch (error) {
            console.log("Buffer check:", error);
        }
    }


    /* =====================================================
       4. VIDEO READY
       ===================================================== */

    function prepareVideo() {

        if (loadComplete) return;

        /*
         * We need metadata + at least the first frame.
         */
        if (
            !video.readyState ||
            video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            return;
        }

        firstFrameReady = true;
        loadComplete = true;

        setPercent(100);

        /*
         * Give Safari a tiny moment to paint the first frame.
         */
        requestAnimationFrame(() => {

            requestAnimationFrame(() => {

                if (loader) {
                    loader.classList.add("hide");
                }

                attachInteractionListeners();

            });

        });
    }


    /* =====================================================
       5. SAFARI / iOS VIDEO INITIALIZATION
       ===================================================== */

    /*
     * Calling load() after DOM is ready helps Safari initialize
     * the media element correctly.
     */
    try {
        video.muted = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");

        video.preload = "auto";

        video.load();

    } catch (error) {
        console.log("Video initialization:", error);
    }


    /* =====================================================
       6. FIRST FRAME READY
       ===================================================== */

    video.addEventListener("loadeddata", () => {

        /*
         * loadeddata means the first frame is available.
         * This is more useful for our purpose than waiting
         * for canplaythrough.
         */
        prepareVideo();

    });


    video.addEventListener("canplay", () => {

        /*
         * Safari may reach canplay before loadeddata
         * depending on its decoding behavior.
         */
        prepareVideo();

    });


    video.addEventListener("progress", updateProgress);

    video.addEventListener("loadedmetadata", () => {

        setPercent(5);

        updateProgress();

    });


    /* =====================================================
       7. INTERACTION
       ===================================================== */

    const interactionEvents = [
        "touchstart",
        "pointerdown",
        "click",
        "keydown"
    ];


    function attachInteractionListeners() {

        interactionEvents.forEach(event => {

            window.addEventListener(
                event,
                startVideo,
                {
                    passive: true
                }
            );

        });

    }


    function removeInteractionListeners() {

        interactionEvents.forEach(event => {

            window.removeEventListener(
                event,
                startVideo
            );

        });

    }


    /* =====================================================
       8. START VIDEO
       ===================================================== */

    function startVideo() {

        if (!loadComplete || isPlaying || !firstFrameReady) {
            return;
        }

        /*
         * Important for iPhone/Safari autoplay policy.
         */
        video.muted = true;
        video.setAttribute("muted", "");

        /*
         * DO NOT set currentTime = 0 here.
         * Safari can show a black frame when seeking
         * immediately before playback.
         */

        const playPromise = video.play();

        if (playPromise !== undefined) {

            playPromise
                .then(() => {

                    isPlaying = true;

                    removeInteractionListeners();

                })
                .catch(error => {

                    console.log(
                        "Video play waiting for interaction:",
                        error
                    );

                });

        } else {

            isPlaying = true;

            removeInteractionListeners();

        }

    }


    /* =====================================================
       9. INVITATION REVEAL — LAST 4 SECONDS
       ===================================================== */

    function revealText() {

        if (textTriggered) return;

        textTriggered = true;

        if (videoOverlay) {
            videoOverlay.classList.add("darken");
        }

        if (!prefersReducedMotion) {

            video.classList.add("blur-effect");

        }

        if (heroContent) {

            heroContent.classList.add("show-text");

        }

    }


    /* =====================================================
       10. VIDEO TIME
       ===================================================== */

    video.addEventListener("timeupdate", () => {

        if (
            !video.duration ||
            !isFinite(video.duration)
        ) {
            return;
        }

        const remaining =
            video.duration - video.currentTime;

        if (remaining <= 4) {

            revealText();

        }

    });


    /* =====================================================
       11. VIDEO ENDED
       ===================================================== */

    video.addEventListener("ended", () => {

        /*
         * Keep the final frame visible.
         * Don't reset currentTime.
         */
        isPlaying = false;

    });


    /* =====================================================
       12. VIDEO ERROR
       ===================================================== */

    video.addEventListener("error", () => {

        console.log(
            "Video error:",
            video.error
        );

        /*
         * Don't leave the user permanently stuck.
         */
        if (!loadComplete) {

            loadComplete = true;

            setPercent(100);

            if (loader) {
                loader.classList.add("hide");
            }

            attachInteractionListeners();

        }

    });


    /* =====================================================
       13. STALLED / WAITING
       ===================================================== */

    video.addEventListener("stalled", () => {

        console.log("Video stalled");

    });


    video.addEventListener("waiting", () => {

        console.log("Video waiting for data");

    });


    /* =====================================================
       14. SAFETY FALLBACK
       ===================================================== */

    /*
     * Don't use a short timeout to fake 100%.
     *
     * 15 seconds is still allowed as a last-resort
     * fallback for extremely unusual cases.
     */
    setTimeout(() => {

        if (!loadComplete && video.readyState >= 2) {

            prepareVideo();

        }

    }, 15000);

});
