/* ==========================================================================
   ZEN LISALD - REAL HUSTLER LP Javascript Logic
   Interactive animations, Web Audio trap beat generator, and Canvas visualizer.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    init3DTilt();
    initCarouselDrag();
    initAudioEngine();
});

/* ==========================================================================
   1. Scroll Animations (Intersection Observer)
   ========================================================================== */
function initScrollAnimations() {
    const ethosSection = document.getElementById('ethos');
    
    const observerOptions = {
        root: null,
        threshold: 0.35, // Trigger when 35% of the section is visible
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Once active, we don't need to observe anymore
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    if (ethosSection) {
        observer.observe(ethosSection);
    }
}

/* ==========================================================================
   2. 3D Tilt Effect on Album Jacket
   ========================================================================== */
function init3DTilt() {
    const card = document.getElementById('jacket-card');
    if (!card) return;
    
    const shine = card.querySelector('.jacket-shine');

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; //x position within the element.
        const y = e.clientY - rect.top;  //y position within the element.
        
        // Calculate percentages
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        // Calculate rotation angles (max 15 degrees)
        const rotateY = -((x - xc) / xc) * 15;
        const rotateX = ((y - yc) / yc) * 15;
        
        // Apply rotation
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`;
        
        // Adjust light reflections (shine effect)
        const shineX = (x / rect.width) * 100;
        const shineY = (y / rect.height) * 100;
        shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)`;
    });

    card.addEventListener('mouseleave', () => {
        // Reset card pose smooth
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        shine.style.background = `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)`;
    });
}

/* ==========================================================================
   3. Horizontal Carousel Drag Scroll
   ========================================================================== */
function initCarouselDrag() {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        carousel.classList.add('active');
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });

    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.classList.remove('active');
    });

    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.classList.remove('active');
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll speed multiplier
        carousel.scrollLeft = scrollLeft - walk;
    });

    // Touch support for mobile swipe
    carousel.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    }, { passive: true });

    carousel.addEventListener('touchend', () => {
        isDown = false;
    });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (x - startX) * 1.5;
        carousel.scrollLeft = scrollLeft - walk;
    }, { passive: true });
}

/* ==========================================================================
   4. Web Audio API Trap Beat Engine & Visualizer
   ========================================================================== */
function initAudioEngine() {
    const btnPreview = document.getElementById('btn-preview');
    const audioStatus = document.getElementById('audio-status');
    const canvas = document.getElementById('visualizer-canvas');
    if (!btnPreview || !audioStatus || !canvas) return;

    let audioCtx = null;
    let analyser = null;
    let audioBuffer = null;
    let currentSource = null;
    let gainNode = null;
    let isPlaying = false;
    let isLoading = false;
    let stopTimerId = null;
    let drawVisualId = null;

    // Set up canvas sizes
    const ctx2d = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx2d.scale(dpr, dpr);
    }

    // Pre-init AudioContext and fetch Audio Buffer
    async function loadAudio() {
        if (audioBuffer || isLoading) return;
        isLoading = true;
        audioStatus.textContent = 'LOADING MUSIC...';

        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
            }
            const response = await fetch('assets/hustler.wav');
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioStatus.textContent = '脳天を揺らす808。15秒で世界が変わる。';
        } catch (err) {
            console.error('Failed to load audio:', err);
            audioStatus.textContent = '脳天を揺らす808。15秒で世界が変わる。';
        } finally {
            isLoading = false;
        }
    }

    // Preload audio on hover or initial touch for instant response
    btnPreview.addEventListener('mouseenter', loadAudio, { once: true });
    btnPreview.addEventListener('touchstart', loadAudio, { once: true, passive: true });

    // Trigger Play / Stop
    btnPreview.addEventListener('click', async () => {
        if (isPlaying) {
            stopBeat();
        } else {
            await startBeat();
        }
    });

    async function startBeat() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
        }

        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        if (!audioBuffer) {
            await loadAudio();
            if (!audioBuffer) return;
        }

        isPlaying = true;
        btnPreview.classList.add('playing');
        btnPreview.querySelector('.play-icon').textContent = '■';
        btnPreview.querySelector('.btn-text').textContent = 'STOP';
        audioStatus.textContent = 'PLAYING HUSTLER (15S)';
        audioStatus.classList.add('playing');

        // Create Source & Gain Nodes
        currentSource = audioCtx.createBufferSource();
        currentSource.buffer = audioBuffer;

        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.85, audioCtx.currentTime);

        // Schedule 2-second fade-out before the 15-second mark
        gainNode.gain.setValueAtTime(0.85, audioCtx.currentTime + 13.0);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 15.0);

        currentSource.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        currentSource.start(0);

        // 15 seconds limit timer
        stopTimerId = setTimeout(() => {
            stopBeat();
        }, 15000);

        // Start visualizer animation
        drawVisualizer();
    }

    function stopBeat() {
        isPlaying = false;
        btnPreview.classList.remove('playing');
        btnPreview.querySelector('.play-icon').textContent = '▶';
        btnPreview.querySelector('.btn-text').textContent = '15秒だけ聴く';
        audioStatus.textContent = '脳天を揺らす808。15秒で世界が変わる。';
        audioStatus.classList.remove('playing');

        if (currentSource) {
            try {
                currentSource.stop();
                currentSource.disconnect();
            } catch (e) {}
            currentSource = null;
        }

        if (stopTimerId) clearTimeout(stopTimerId);
        if (drawVisualId) cancelAnimationFrame(drawVisualId);
        
        // Clear canvas
        ctx2d.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    /* ==========================================================================
       CANVAS VISUALIZER (Orbiting Neon Waves)
       ========================================================================== */
    function drawVisualizer() {
        if (!isPlaying) return;
        
        drawVisualId = requestAnimationFrame(drawVisualizer);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const cx = width / 2;
        const cy = height / 2;
        
        // Clear canvas with subtle trail effect (alpha blend)
        ctx2d.fillStyle = 'rgba(10, 10, 12, 0.2)';
        ctx2d.fillRect(0, 0, width, height);
        
        // Render 3 orbiting rings representing the visualizer waveform
        const rings = [
            { radius: 154, color: '#ff003c', lineWidth: 1.5, scale: 0.8 },
            { radius: 160, color: 'rgba(255, 0, 60, 0.4)', lineWidth: 1.0, scale: 0.6 },
            { radius: 148, color: 'rgba(255, 255, 255, 0.15)', lineWidth: 0.8, scale: 0.4 }
        ];

        rings.forEach((ring, index) => {
            ctx2d.beginPath();
            ctx2d.strokeStyle = ring.color;
            ctx2d.lineWidth = ring.lineWidth;
            
            // Neon glow effect for the primary ring
            if (index === 0) {
                ctx2d.shadowBlur = 12;
                ctx2d.shadowColor = 'rgba(255, 0, 60, 0.8)';
            } else {
                ctx2d.shadowBlur = 0;
            }

            for (let i = 0; i < 360; i += 2) {
                const angle = (i * Math.PI) / 180;
                
                // Fetch sample data representing current time domain waveform
                const sampleIndex = Math.floor((i / 360) * bufferLength);
                // Map byte value (0-255) to normal scale (-1.0 to 1.0)
                const sampleVal = (dataArray[sampleIndex] - 128) / 128;
                
                // Add wave displacement to circle radius
                const displacement = sampleVal * 45 * ring.scale;
                const r = ring.radius + displacement;
                
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;

                if (i === 0) {
                    ctx2d.moveTo(x, y);
                } else {
                    ctx2d.lineTo(x, y);
                }
            }
            ctx2d.closePath();
            ctx2d.stroke();
        });
        
        // Reset shadow properties for next draw
        ctx2d.shadowBlur = 0;
    }
}
