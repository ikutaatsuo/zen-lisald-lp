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
    let isPlaying = false;
    let schedulerTimerId = null;
    let stopTimerId = null;
    let drawVisualId = null;
    
    // Drum tempo & scheduling vars
    const tempo = 140; // BPM
    const lookahead = 25.0; // How frequently to call scheduler (in ms)
    const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
    let nextNoteTime = 0.0; // When the next note is due
    let current16thNote = 0; // Current 16th note step in loop (0-15)
    
    // Sound synthesis noise buffers
    let noiseBuffer = null;

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

    // Generate White Noise Buffer for Hi-Hats & Snares
    function createNoiseBuffer(ctx) {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Trigger Play / Stop
    btnPreview.addEventListener('click', () => {
        if (isPlaying) {
            stopBeat();
        } else {
            startBeat();
        }
    });

    function startBeat() {
        // Initialize Web Audio Context on user gesture
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            noiseBuffer = createNoiseBuffer(audioCtx);
        }

        // Resume context if suspended (browser safety)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        isPlaying = true;
        btnPreview.classList.add('playing');
        btnPreview.querySelector('.play-icon').textContent = '■';
        btnPreview.querySelector('.btn-text').textContent = 'STOP';
        audioStatus.textContent = 'PLAYING REAL BEAT (15S)';
        audioStatus.classList.add('playing');

        // Scheduler timing setup
        nextNoteTime = audioCtx.currentTime;
        current16thNote = 0;
        schedulerLoop();

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
        audioStatus.textContent = 'TAP TO FEEL THE BASS';
        audioStatus.classList.remove('playing');

        if (schedulerTimerId) clearTimeout(schedulerTimerId);
        if (stopTimerId) clearTimeout(stopTimerId);
        if (drawVisualId) cancelAnimationFrame(drawVisualId);
        
        // Clear canvas
        ctx2d.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    // Audio Scheduler Loop
    function schedulerLoop() {
        while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
            scheduleNote(current16thNote, nextNoteTime);
            advanceNote();
        }
        schedulerTimerId = setTimeout(schedulerLoop, lookahead);
    }

    function advanceNote() {
        // Advance to next 16th note step
        const secondsPerBeat = 60.0 / tempo;
        const secondsPer16th = secondsPerBeat / 4;
        nextNoteTime += secondsPer16th;
        
        current16thNote = (current16thNote + 1) % 16;
    }

    /* ==========================================================================
       SOUND SYNTHESIS ENGINES
       ========================================================================== */
    function scheduleNote(step, time) {
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.75, time);
        
        // Master Volume Fade-out in the last 2 seconds of preview
        // Note: active duration is 15s. If audioCtx.currentTime exceeds 13s, fade out.
        if (audioCtx.currentTime > 12.5) {
            const fadeRemaining = 15.0 - (audioCtx.currentTime - (nextNoteTime - audioCtx.currentTime));
            masterGain.gain.setValueAtTime(0.75, time);
            masterGain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);
        }
        
        masterGain.connect(analyser);
        analyser.connect(audioCtx.destination);

        // 1. Kick/808 Bass (Sub-Bass) Pattern
        // Deep sub-bass kick at step 0, step 8, step 11
        if (step === 0 || step === 8 || step === 11) {
            play808Bass(time, masterGain);
        }

        // 2. Snare Pattern
        // Classic trap snare at 2nd and 4th beats (step 4, step 12)
        if (step === 4 || step === 12) {
            playSnare(time, masterGain);
        }

        // 3. Hi-Hat Pattern
        // Constant 8th notes, with fast rolls on step 6 and 14
        let hatPitchMultiplier = 1;
        let isHatPlaying = false;

        if (step % 2 === 0) {
            isHatPlaying = true; // Regular 8th note hat
        } else if (step === 7 || step === 15) {
            isHatPlaying = true; // Fast roll pickup
            hatPitchMultiplier = 1.8; // Higher pitch roll
        }

        if (isHatPlaying) {
            playHiHat(time, masterGain, hatPitchMultiplier);
        }

        // 4. Dark Trap Melody Pattern (Minor Cord Arpeggio)
        // Dark hypnotic synthetic melody plucks
        playMelody(step, time, masterGain);
    }

    // Synthesize Sub-Bass (808)
    function play808Bass(time, dest) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        
        // Pitch drop effect (808 signature)
        osc.frequency.setValueAtTime(78, time);
        osc.frequency.exponentialRampToValueAtTime(41, time + 0.18); // drop to deep low E
        
        // Volume envelope
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.65);
        
        osc.connect(gain);
        gain.connect(dest);
        
        osc.start(time);
        osc.stop(time + 0.7);
    }

    // Synthesize Trap Snare
    function playSnare(time, dest) {
        // Noise component
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.55, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);

        // Body component (Low mid pitch drop)
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.linearRampToValueAtTime(100, time + 0.08);
        
        oscGain.gain.setValueAtTime(0.4, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
        
        osc.connect(oscGain);
        oscGain.connect(dest);
        
        noise.start(time);
        osc.start(time);
        
        noise.stop(time + 0.2);
        osc.stop(time + 0.1);
    }

    // Synthesize Hi-Hat
    function playHiHat(time, dest, pitchMod) {
        const source = audioCtx.createBufferSource();
        source.buffer = noiseBuffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7500 * pitchMod;
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        source.start(time);
        source.stop(time + 0.06);
    }

    // Synthesize Dark Pluck Melody
    // F# minor dark trap melody arpeggio
    // F#3 (185Hz), A3 (220Hz), C#4 (277Hz), E4 (329Hz)
    const melodyNotes = [
        185, 0, 220, 0, 277, 220, 185, 0,
        329, 0, 277, 0, 220, 277, 329, 0
    ];

    function playMelody(step, time, dest) {
        const noteFreq = melodyNotes[step];
        if (noteFreq === 0) return; // Rest

        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, time);
        
        // Lowpass filter decay to make it "pluck" sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + 0.28);
        
        // Pluck volume envelope
        gain.gain.setValueAtTime(0.24, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.32);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(time);
        osc.stop(time + 0.35);
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
