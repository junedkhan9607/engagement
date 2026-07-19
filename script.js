document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 1. CURTAIN + MUSIC SYSTEM
    // ==========================================
    const curtain = document.getElementById("curtainOverlay");
    const mainContent = document.getElementById("mainContent");
    const music = document.getElementById("bgMusic");
    const musicBtn = document.getElementById("musicToggle");
    const body = document.body;

    let isMusicPlaying = false;
    music.volume = 0.35;

    function startMusic() {
        music.play().then(() => {
            isMusicPlaying = true;
            const icon = musicBtn.querySelector('i');
            if (icon) icon.style.color = '#e5c158';
        }).catch(() => {
            isMusicPlaying = false;
            const icon = musicBtn.querySelector('i');
            if (icon) icon.style.color = '#666';
        });
    }

    // Open Curtain on Click
    if (curtain) {
        curtain.addEventListener("click", () => {
            // 1. Open animation
            curtain.classList.add("open");
            
            // 2. Enable scroll after curtain opens
            setTimeout(() => {
                body.classList.add("scroll-active");
            }, 400);

            // 3. Show main content
            setTimeout(() => {
                if (mainContent) mainContent.classList.add("visible");
            }, 300);

            // 4. Show music button with bounce effect
            setTimeout(() => {
                if (musicBtn) musicBtn.classList.add("visible");
            }, 600);

            // 5. Auto-play music
            startMusic();

            // 6. Hide curtain after animation completes
            setTimeout(() => {
                curtain.style.display = "none";
            }, 2000);
        });
    }

    // Music Toggle Button
    if (musicBtn) {
        musicBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (isMusicPlaying) {
                music.pause();
                isMusicPlaying = false;
                const icon = musicBtn.querySelector('i');
                if (icon) icon.style.color = '#666';
            } else {
                music.play();
                isMusicPlaying = true;
                const icon = musicBtn.querySelector('i');
                if (icon) icon.style.color = '#e5c158';
            }
        });
    }
     // Pause music when page goes to background
document.addEventListener("visibilitychange", () => {
    if (document.hidden && isMusicPlaying) {
        music.pause();
    } else if (!document.hidden && isMusicPlaying) {
        music.play().catch(() => {});
    }
});

    // ==========================================
    // 2. FLOATING PARTICLES (Background Stars)
    // ==========================================
    const particlesContainer = document.getElementById("particles");
    if (particlesContainer) {
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement("div");
            particle.classList.add("particle");
            particle.style.left = Math.random() * 100 + "%";
            particle.style.width = (Math.random() * 4 + 2) + "px";
            particle.style.height = particle.style.width;
            particle.style.animationDelay = (Math.random() * 20) + "s";
            particle.style.animationDuration = (15 + Math.random() * 15) + "s";
            particlesContainer.appendChild(particle);
        }
    }

    // ==========================================
    // 3. SCRATCH CARD
    // ==========================================
    const canvas = document.getElementById("scratchCanvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        let isScratching = false;
        let scratchComplete = false;

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
            ctx.fillStyle = "#d4af37";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "italic 18px Montserrat";
            ctx.fillStyle = "#4a0e17";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("✦ Scratch Here ✦", canvas.width / 2, canvas.height / 2);
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
            checkScratchProgress();
        }

        // Mouse Events
        canvas.addEventListener("mousedown", (e) => { isScratching = true; scratch(e); });
        canvas.addEventListener("mousemove", scratch);
        document.addEventListener("mouseup", () => { isScratching = false; });

        // Touch Events (Mobile)
        canvas.addEventListener("touchstart", (e) => { isScratching = true; scratch(e); }, { passive: false });
        canvas.addEventListener("touchmove", scratch, { passive: false });
        document.addEventListener("touchend", () => { isScratching = false; });

        function checkScratchProgress() {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let transparent = 0;
            const total = pixels.length / 4;
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] === 0) transparent++;
            }
            const percent = (transparent / total) * 100;
            if (percent > 40 && !scratchComplete) {
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

        // Initial draw
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
    }

    // ==========================================
    // 4. COUNTDOWN TIMER
    // ==========================================
    function showCountdown() {
        const container = document.getElementById("countdownContainer");
        if (container) {
            container.classList.add("visible");
            startCountdown();
        }
    }

    function startCountdown() {
        const targetDate = new Date("august 1, 2026 00:00:00").getTime();
        
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
    // Golden flash effect
    const flash = document.createElement("div");
    flash.className = "golden-flash";
    document.body.appendChild(flash);

    setTimeout(() => flash.remove(), 1000);

    // Date card animation
    document.querySelector(".date-hidden").classList.add("date-reveal");

    // Extra petals
    if (window.startFlowerCelebration) {
        startFireworks();
        setTimeout(() => window.startFlowerCelebration(), 800);
    }

    // Soft chime sound
    //const chime = new Audio(
       // "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"
    //);
    //chime.volume = 0.4;
    //chime.play().catch(() => {});
}
function startFireworks() {
    const canvas = document.getElementById("confettiCanvas");
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
        const colors = [
            "#FFD700",
            "#e5c158",
            "#ffffff",
            "#ffb6c1",
            "#ffdf80"
        ];

        for (let i = 0; i < 25; i++) {
            particles.push(
                new Particle(
                    x,
                    y,
                    colors[Math.floor(Math.random() * colors.length)]
                )
            );
        }
    }

    explode(canvas.width * 0.3, canvas.height * 0.4);

    setTimeout(() => {
        explode(canvas.width * 0.7, canvas.height * 0.35);
    }, 500);

    setTimeout(() => {
        explode(canvas.width * 0.5, canvas.height * 0.25);
    }, 1000);

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();

            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }

        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}

    // ==========================================
    // 5. FLOWER CONFETTI
    // ==========================================
    const confettiCanvas = document.getElementById("confettiCanvas");
    if (confettiCanvas) {
        const cCtx = confettiCanvas.getContext("2d");
        let flowers = [];
        let confettiAnimId = null;

        function resizeConfetti() {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
        window.addEventListener("resize", resizeConfetti);
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
                const colors = ["#ffb7c5", "#ffdae0", "#ffffff", "#f4ccd4", "#e5c158"];
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
            const maxFlowers = 35;

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
                if (cCtx) {
                    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                }
                flowers = [];
            }, 7000);
        };
    }

    // ==========================================
    // 6. SCROLL ANIMATIONS
    // ==========================================
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('element-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px 90px 0px"
    });

    document.querySelectorAll('.profile-card, .greeting-block, .dua-section, .scratch-wrapper, .couple-wrapper, .greetings-wrapper').forEach(el => {
        observer.observe(el);
    });

    // ==========================================
    // 7. SECTION-END SCROLL-TO-NEXT INDICATORS
    // ==========================================
    document.querySelectorAll('.section-scroll-next').forEach(el => {
        el.addEventListener('click', () => {
            const nextId = el.getAttribute('data-next');
            const nextSection = nextId ? document.getElementById(nextId) : null;
            if (nextSection) {
                nextSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    console.log("✅ Wedding Website Loaded Successfully!");
});
