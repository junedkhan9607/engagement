document.addEventListener("DOMContentLoaded", () => {

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* =====================================================
       0. TINY PERFORMANCE HELPER
       Coalesces rapid-fire events (resize/scroll) onto a
       single requestAnimationFrame instead of running the
       handler on every single event.
       ===================================================== */

    function rafThrottle(fn) {
        let ticking = false;
        return function throttled(...args) {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                fn.apply(this, args);
                ticking = false;
            });
        };
    }


    /* =====================================================
       1. VIEWPORT HEIGHT — iOS + ANDROID (used by .hero's 100dvh fallback)
       ===================================================== */

    function setViewportHeight() {
        document.documentElement.style.setProperty(
            "--vh",
            `${window.innerHeight * 0.01}px`
        );
    }

    setViewportHeight();
    const throttledViewportHeight = rafThrottle(setViewportHeight);
    window.addEventListener("resize", throttledViewportHeight, { passive: true });
    window.addEventListener("orientationchange", throttledViewportHeight, { passive: true });


    /* =====================================================
       2. SCROLL PROGRESS RAIL
       ===================================================== */

    const scrollProgress = document.getElementById("scrollProgress");

    function updateScrollProgress() {
        if (!scrollProgress) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        scrollProgress.style.width = Math.min(100, Math.max(0, percent)) + "%";
    }

    if (scrollProgress) {
        updateScrollProgress();
        window.addEventListener("scroll", rafThrottle(updateScrollProgress), { passive: true });
        window.addEventListener("resize", rafThrottle(updateScrollProgress), { passive: true });
    }


    /* =====================================================
       3. HERO VIDEO — LOADER, BUFFER PROGRESS, GATED AUTOPLAY
       ===================================================== */

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

    if (video) {

        function setPercent(percent) {
            const value = Math.max(0, Math.min(100, Math.round(percent)));
            if (barFill) barFill.style.width = value + "%";
            if (percentText) percentText.textContent = value + "%";
            return value;
        }

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
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const percent = (bufferedEnd / video.duration) * 100;

                setPercent(percent);

                /* Don't wait for an exact 100%. If the browser has enough
                   data to play, mark it ready. */
                if (percent >= 95) {
                    prepareVideo();
                }
            } catch (error) {
                console.log("Buffer check:", error);
            }
        }

        function prepareVideo() {
            if (loadComplete) return;

            if (
                !video.readyState ||
                video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
            ) {
                return;
            }

            firstFrameReady = true;
            loadComplete = true;

            setPercent(100);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (loader) loader.classList.add("hide");
                    attachInteractionListeners();
                });
            });
        }

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

        video.addEventListener("loadeddata", prepareVideo);
        video.addEventListener("canplay", prepareVideo);
        video.addEventListener("progress", updateProgress);

        video.addEventListener("loadedmetadata", () => {
            setPercent(5);
            updateProgress();
        });

        /* -------- Interaction-gated play (touch / scroll / click) -------- */

        const interactionEvents = [
            "touchstart",
            "pointerdown",
            "click",
            "keydown",
            "wheel",
            "scroll"
        ];

        function attachInteractionListeners() {
            interactionEvents.forEach(evt => {
                window.addEventListener(evt, startVideo, { passive: true });
            });
        }

        function removeInteractionListeners() {
            interactionEvents.forEach(evt => {
                window.removeEventListener(evt, startVideo);
            });
        }

        function startVideo() {
            if (!loadComplete || isPlaying || !firstFrameReady) return;

            video.muted = true;
            video.setAttribute("muted", "");

            /* DO NOT set currentTime = 0 here.
               Safari can show a black frame when seeking immediately
               before playback. */

            const playPromise = video.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        isPlaying = true;
                        removeInteractionListeners();
                    })
                    .catch(error => {
                        console.log("Video play waiting for interaction:", error);
                    });
            } else {
                isPlaying = true;
                removeInteractionListeners();
            }

            /* Same user gesture that starts the video also gives us
               permission to start the background music — one motion,
               one moment, instead of asking twice. */
            attemptAutoMusic();
        }

        function revealText() {
            if (textTriggered) return;
            textTriggered = true;

            if (videoOverlay) videoOverlay.classList.add("darken");
            if (!prefersReducedMotion) video.classList.add("blur-effect");
            if (heroContent) heroContent.classList.add("show-text");
        }

        video.addEventListener("timeupdate", () => {
            if (!video.duration || !isFinite(video.duration)) return;
            const remaining = video.duration - video.currentTime;
            if (remaining <= 4) revealText();
        });

        video.addEventListener("ended", () => {
            isPlaying = false;
        });

        video.addEventListener("error", () => {
            console.log("Video error:", video.error);
            if (!loadComplete) {
                loadComplete = true;
                setPercent(100);
                if (loader) loader.classList.add("hide");
                attachInteractionListeners();
            }
        });

        video.addEventListener("stalled", () => console.log("Video stalled"));
        video.addEventListener("waiting", () => console.log("Video waiting for data"));

        setTimeout(() => {
            if (!loadComplete && video.readyState >= 2) {
                prepareVideo();
            }
        }, 15000);

    } else if (loader) {
        loader.classList.add("hide");
    }


    /* =====================================================
       4. MUSIC SYSTEM
       FIX: previously the button flipped to "playing" state
       the instant it was clicked, without waiting to see if
       music.play() actually succeeded — so on any autoplay
       block or load hiccup the icon looked "on" while the
       track stayed silent. Now the UI only reflects the real
       state, resolved from the Play promise.
       ===================================================== */

    const music = document.getElementById("bgMusic");
    const musicBtn = document.getElementById("musicToggle");
    let isMusicPlaying = false;
    let musicAutoTried = false;

    if (music) music.volume = 0.35;

    function setMusicState(playing) {
        isMusicPlaying = playing;
        if (musicBtn) {
            musicBtn.classList.toggle("playing", playing);
            musicBtn.classList.remove("loading");
            musicBtn.setAttribute(
                "aria-label",
                playing ? "Pause background music" : "Play background music"
            );
        }
    }

    function playMusic() {
        if (!music) return Promise.reject(new Error("no audio element"));
        if (musicBtn) musicBtn.classList.add("loading");

        return music.play()
            .then(() => {
                setMusicState(true);
            })
            .catch(error => {
                console.log("Music playback blocked or failed:", error);
                setMusicState(false);
                if (musicBtn) musicBtn.classList.remove("loading");
            });
    }

    function attemptAutoMusic() {
        /* Only try once automatically — after that it's fully
           under the user's manual control via the button. */
        if (musicAutoTried || isMusicPlaying || !music) return;
        musicAutoTried = true;
        playMusic();
    }

    if (musicBtn && music) {
        musicBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            musicAutoTried = true; // manual control now, don't auto-trigger later
            if (isMusicPlaying) {
                music.pause();
                setMusicState(false);
            } else {
                playMusic();
            }
        });

        music.addEventListener("error", () => {
            console.log("Music file failed to load:", music.error);
            musicBtn.classList.add("music-error");
            musicBtn.setAttribute("aria-label", "Music unavailable");
        });

        music.addEventListener("pause", () => {
            if (isMusicPlaying) setMusicState(false);
        });
    }


    /* =====================================================
       5. SCRATCH CARD
       Progress check is now throttled to one measurement per
       animation frame instead of on every pointer-move event —
       getImageData is the expensive part, this keeps it cheap.
       ===================================================== */

    const canvas = document.getElementById("scratchCanvas");
    if (canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        let isScratching = false;
        let scratchComplete = false;
        let progressCheckQueued = false;

        function resizeCanvas() {
            const container = canvas.parentElement;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width || 340;
            canvas.height = rect.height || 220;
            drawScratchLayer();
        }

        function drawScratchLayer() {
            if (!ctx) return;
            // Matches the scratch-box's own CSS gradient border
            // (magenta -> gold -> marigold) instead of a flat, older gold.
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, "#D6336C");
            gradient.addColorStop(0.5, "#FFC93C");
            gradient.addColorStop(1, "#FF9800");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "italic 18px Montserrat";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
            ctx.shadowBlur = 4;
            ctx.fillText("✦ Scratch Here ✦", canvas.width / 2, canvas.height / 2);
            ctx.shadowBlur = 0;
        }

        function getPosition(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        function scratch(e) {
            if (!isScratching || scratchComplete) return;
            e.preventDefault();
            const pos = getPosition(e);
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            const brushSize = Math.min(canvas.width, canvas.height) * 0.1;
            ctx.arc(pos.x, pos.y, brushSize, 0, Math.PI * 2);
            ctx.fill();
            queueScratchProgressCheck();
        }

        function queueScratchProgressCheck() {
            if (progressCheckQueued) return;
            progressCheckQueued = true;
            requestAnimationFrame(() => {
                checkScratchProgress();
                progressCheckQueued = false;
            });
        }

        canvas.addEventListener("mousedown", (e) => { isScratching = true; scratch(e); });
        canvas.addEventListener("mousemove", scratch);
        document.addEventListener("mouseup", () => { isScratching = false; });

        canvas.addEventListener("touchstart", (e) => { isScratching = true; scratch(e); }, { passive: false });
        canvas.addEventListener("touchmove", scratch, { passive: false });
        document.addEventListener("touchend", () => { isScratching = false; });

        function checkScratchProgress() {
            if (scratchComplete) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let transparent = 0;
            const total = pixels.length / 4;
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] === 0) transparent++;
            }
            const percent = (transparent / total) * 100;
            if (percent > 40) {
                scratchComplete = true;
                canvas.style.transition = "opacity 0.8s ease";
                canvas.style.opacity = "0";
                setTimeout(() => {
                    canvas.style.display = "none";
                }, 800);
                celebrateDateReveal();
                showCountdown();
            }
        }

        resizeCanvas();
        window.addEventListener("resize", rafThrottle(resizeCanvas), { passive: true });
    }


    /* =====================================================
       6. COUNTDOWN TIMER
       ===================================================== */

    function showCountdown() {
        const container = document.getElementById("countdownContainer");
        if (container) {
            container.classList.add("visible");
            startCountdown();
        }
    }

    function startCountdown() {
        const targetDate = new Date("December 27, 2026 00:00:00").getTime();

        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                document.getElementById("days").textContent = "00";
                document.getElementById("hours").textContent = "00";
                document.getElementById("minutes").textContent = "00";
                document.getElementById("seconds").textContent = "00";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById("days").textContent = String(days).padStart(2, "0");
            document.getElementById("hours").textContent = String(hours).padStart(2, "0");
            document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
            document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    function celebrateDateReveal() {
        const flash = document.createElement("div");
        flash.className = "golden-flash";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1000);

        const dateHidden = document.querySelector(".date-hidden");
        if (dateHidden) dateHidden.classList.add("date-reveal");

        /* Respect reduced-motion: skip the fireworks/petal burst and
           just reveal the date calmly. */
        if (!prefersReducedMotion) {
            startFireworks();
            if (window.startFlowerCelebration) {
                setTimeout(() => window.startFlowerCelebration(), 800);
            }
        }

        
    }

    function startFireworks() {
        const canvas = document.getElementById("confettiCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];

        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.radius = Math.random() * 3 + 2;
                this.color = color;
                this.speed = Math.random() * 6 + 2;
                this.angle = Math.random() * Math.PI * 2;
                this.life = 100;
            }

            update() {
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.speed *= 0.97;
                this.life--;
            }

            draw() {
                ctx.globalAlpha = this.life / 100;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        function explode(x, y) {
            const colors = ["#FFC93C", "#D6336C", "#FF9800", "#ffffff", "#FFE7A0"];
            for (let i = 0; i < 40; i++) {
                particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
            }
        }

        explode(canvas.width * 0.3, canvas.height * 0.4);
        setTimeout(() => explode(canvas.width * 0.7, canvas.height * 0.35), 500);
        setTimeout(() => explode(canvas.width * 0.5, canvas.height * 0.25), 1000);

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw();
                if (particles[i].life <= 0) particles.splice(i, 1);
            }

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        animate();
    }


    /* =====================================================
       7. FLOWER CONFETTI
       ===================================================== */

    const confettiCanvas = document.getElementById("confettiCanvas");
    if (confettiCanvas) {
        const cCtx = confettiCanvas.getContext("2d");
        let flowers = [];
        let confettiAnimId = null;

        function resizeConfetti() {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
        window.addEventListener("resize", rafThrottle(resizeConfetti), { passive: true });
        resizeConfetti();

        class FlowerPetal {
            constructor() {
                this.x = Math.random() * confettiCanvas.width;
                this.y = confettiCanvas.height + 20;
                this.size = Math.random() * 10 + 6;
                this.speedY = -(Math.random() * 5 + 4);
                this.speedX = (Math.random() - 0.5) * 5;
                this.rotation = Math.random() * 360;
                this.rotSpeed = (Math.random() - 0.5) * 3;
                const colors = ["#D6336C", "#FF9800", "#ffffff", "#FFE7A0", "#F4C9CE"];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.y += this.speedY;
                this.x += this.speedX;
                this.speedY += 0.08;
                this.rotation += this.rotSpeed;
            }

            draw() {
                if (!cCtx) return;
                cCtx.save();
                cCtx.translate(this.x, this.y);
                cCtx.rotate((this.rotation * Math.PI) / 180);
                cCtx.fillStyle = this.color;
                cCtx.beginPath();
                cCtx.ellipse(0, 0, this.size, this.size / 1.5, 0, 0, Math.PI * 2);
                cCtx.fill();
                cCtx.restore();
            }
        }

        window.startFlowerCelebration = function() {
            resizeConfetti();
            let count = 0;
            const maxFlowers = 40;

            const interval = setInterval(() => {
                if (count >= maxFlowers) {
                    clearInterval(interval);
                    return;
                }
                flowers.push(new FlowerPetal());
                count++;
            }, 25);

            function animateFlowers() {
                if (!cCtx) return;
                cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                flowers = flowers.filter(flower => {
                    flower.update();
                    flower.draw();
                    return !(flower.y > confettiCanvas.height + 100 && flower.speedY > 0);
                });
                if (flowers.length > 0) {
                    confettiAnimId = requestAnimationFrame(animateFlowers);
                } else {
                    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                }
            }

            animateFlowers();

            setTimeout(() => {
                if (confettiAnimId) {
                    cancelAnimationFrame(confettiAnimId);
                    confettiAnimId = null;
                }
                if (cCtx) cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                flowers = [];
            }, 7000);
        };
    }


    /* =====================================================
       8. SCROLL-IN ANIMATIONS
       ===================================================== */

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('element-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -30px 0px"
    });

    document.querySelectorAll('.profile-card, .greeting-block, .dua-section, .scratch-wrapper, .couple-wrapper, .greetings-wrapper').forEach(el => {
        observer.observe(el);
    });


    /* =====================================================
       9. SECTION-END SCROLL-TO-NEXT INDICATORS
       ===================================================== */

    document.querySelectorAll('.section-scroll-next').forEach(el => {
        el.addEventListener('click', () => {
            const nextId = el.getAttribute('data-next');
            const nextSection = nextId ? document.getElementById(nextId) : null;
            if (nextSection) {
                nextSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }
        });
    });

    console.log("✅ Wedding Website Loaded Successfully!");
});