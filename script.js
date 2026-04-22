document.addEventListener('DOMContentLoaded', () => {
    const safeQuery = (id) => document.getElementById(id);
    const preloader = safeQuery('preloader');
    const loaderText = safeQuery('loaderText');
    const assemblyCanvas = safeQuery('assembly-canvas');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    const setInteraction = (enabled) => {
        document.body.style.overflow = enabled ? '' : 'hidden';
    };

    /* ============================================================
       0. EXTRA INTERACTIVE SYSTEMS (BITS, OBSERVER, TRACKER)
       ============================================================ */
    
    // Floating Bits Generation
    const initFloatingBits = () => {
        const container = safeQuery('floating-bits');
        if (!container) return;
        for (let i = 0; i < 50; i++) {
            const bit = document.createElement('div');
            bit.className = 'bit';
            const left = Math.random() * 100;
            const delay = Math.random() * 10;
            const dur = 10 + Math.random() * 15;
            const size = 1 + Math.random() * 2;
            bit.style.left = `${left}%`;
            bit.style.animationDelay = `${delay}s`;
            bit.style.animationDuration = `${dur}s`;
            bit.style.width = `${size}px`;
            bit.style.height = `${size}px`;
            container.appendChild(bit);
        }
    };

    // Global Section Observer
    const initSectionObserver = () => {
        const sections = document.querySelectorAll('.section');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('section-active');
                }
            });
        }, { threshold: 0.15 });
        sections.forEach(s => observer.observe(s));
    };

    // Uptime & Precision Tracker
    const initUIExtras = () => {
        const uptimeEl = safeQuery('hero-uptime');
        if (uptimeEl) {
            let uptime = 99.98;
            setInterval(() => {
                uptime = Math.min(100, Math.max(99.90, uptime + (Math.random() * 0.01 - 0.005)));
                uptimeEl.textContent = `${uptime.toFixed(2)}%`;
            }, 3000);
        }
        
        const tracker = safeQuery('tracker');
        const coords = safeQuery('tracker-coords');
        if (tracker && coords) {
            document.addEventListener('mousemove', (e) => {
                tracker.style.left = `${e.clientX}px`;
                tracker.style.top = `${e.clientY}px`;
                coords.textContent = `X:${e.clientX} Y:${e.clientY}`;
            });
        }
    };

    initFloatingBits();
    initSectionObserver();
    initUIExtras();

    /* ============================================================
       1. PRO 3-JOINT SYSTEM (V23.3)
       ============================================================ */
    class RobotArmPro {
        constructor(side = 'right') {
            this.ctx = assemblyCanvas.getContext('2d');
            this.side = side;
            this.accent = '#FFB000';
            this.base = { x: 0, y: -80 };
            this.j1 = { x: 0, y: 0 }; this.j2 = { x: 0, y: 0 }; this.j3 = { x: 0, y: 0 }; 
            const scale = Math.max(window.innerWidth / 1920, 1);
            this.seg1 = 330 * scale; this.seg2 = 270 * scale; this.seg3 = 210 * scale;
            this.cargo = null; this.clawOpenness = 1.0; this.wristAngle = 0;
            this.opacity = 1.0; this.pulse = 0;
            this.resize();
            this.storagePos = { x: this.side === 'right' ? window.innerWidth * 1.1 : -window.innerWidth * 0.1, y: 150 };
            this.currentPos = { ...this.storagePos }; this.targetPos = { ...this.storagePos };
            window.addEventListener('resize', () => this.resize());
        }

        resize() {
            assemblyCanvas.width = window.innerWidth;
            assemblyCanvas.height = window.innerHeight;
            this.base.x = this.side === 'right' ? window.innerWidth * 0.88 : window.innerWidth * 0.12;
            this.base.y = -80;
        }

        solveIK(tx, ty, railFlex = 0.08) {
            const sideF = this.side === 'right' ? 1 : -1;
            const railTarget = tx + (220 * sideF);
            this.base.x += (railTarget - this.base.x) * railFlex;

            const dx = tx - this.base.x, dy = ty - this.base.y;
            const aT = Math.atan2(dy, dx);
            const a1 = aT - (0.4 * sideF);
            this.j1.x = this.base.x + Math.cos(a1) * this.seg1;
            this.j1.y = this.base.y + Math.sin(a1) * this.seg1;

            const d2x = tx - this.j1.x, d2y = ty - this.j1.y;
            const d2 = Math.sqrt(d2x * d2x + d2y * d2y);
            const cos2 = (this.seg2**2 + d2**2 - this.seg3**2) / (2 * this.seg2 * d2);
            const a2 = Math.atan2(d2y, d2x) - (1.0 * sideF) * Math.acos(Math.max(-1, Math.min(1, cos2)));
            this.j2.x = this.j1.x + Math.cos(a2) * this.seg2;
            this.j2.y = this.j1.y + Math.sin(a2) * this.seg2;
            
            this.j3.x = tx; this.j3.y = ty;
            this.wristAngle = Math.atan2(ty - this.j2.y, tx - this.j2.x);
        }

        draw() {
            const ctx = this.ctx;
            ctx.globalAlpha = this.opacity;
            this.pulse += 0.04;
            const glow = Math.sin(this.pulse) * 0.5 + 0.5;

            const drawPiston = (p1, p2, width, label) => {
                const d = Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2);
                const a = Math.atan2(p2.y-p1.y, p2.x-p1.x);
                ctx.save(); ctx.translate(p1.x, p1.y); ctx.rotate(a);
                ctx.fillStyle = '#080808'; ctx.fillRect(0, -width/2, d*0.75, width);
                ctx.strokeStyle = this.accent; ctx.lineWidth = 1; ctx.strokeRect(0, -width/2, d*0.75, width);
                ctx.fillStyle = this.accent; ctx.globalAlpha = this.opacity * (0.2 + glow * 0.1);
                ctx.fillRect(d*0.3, -width/4, d*0.6, width/2);
                if (this.opacity > 0.8) {
                    ctx.globalAlpha = 0.4; ctx.fillStyle = this.accent; ctx.font = '8px Space Mono';
                    ctx.fillText(label, 15, -width);
                }
                ctx.restore();
            };

            drawPiston(this.base, this.j1, 28, 'AXIS_A');
            drawPiston(this.j1, this.j2, 22, 'AXIS_B');
            drawPiston(this.j2, this.j3, 16, 'WRIST_C');

            if (this.cargo) {
                ctx.save(); ctx.translate(this.j3.x, this.j3.y); ctx.rotate(this.wristAngle);
                ctx.strokeStyle = this.accent; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
                ctx.strokeRect(10, -this.cargo.h/2, this.cargo.w, this.cargo.h);
                ctx.setLineDash([]); ctx.restore();
            }

            ctx.save(); ctx.translate(this.j3.x, this.j3.y); ctx.rotate(this.wristAngle);
            ctx.fillStyle = '#111'; ctx.strokeStyle = this.accent;
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill(); ctx.stroke();
            const s = this.clawOpenness * 12;
            [1, -1].forEach(dir => {
                ctx.beginPath(); ctx.moveTo(8, 4 * dir); ctx.lineTo(16, (8 + s) * dir);
                ctx.lineTo(28, (12 + s) * dir); ctx.lineTo(32, (8 + s) * dir);
                ctx.lineWidth = 3; ctx.stroke();
            });
            ctx.restore();

            [this.base, this.j1, this.j2].forEach(j => {
                ctx.beginPath(); ctx.arc(j.x, j.y, 8, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
                ctx.strokeStyle = this.accent; ctx.lineWidth = 2; ctx.stroke();
            });
            ctx.globalAlpha = 1.0;
        }

        async moveTo(x, y, speed = 0.12) {
            this.targetPos = { x, y };
            return new Promise(resolve => {
                const step = () => {
                    const dx = this.targetPos.x - this.currentPos.x;
                    const dy = this.targetPos.y - this.currentPos.y;
                    this.currentPos.x += dx * speed;
                    this.currentPos.y += dy * speed;
                    this.solveIK(this.currentPos.x, this.currentPos.y);
                    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) resolve();
                    else requestAnimationFrame(step);
                };
                step();
            });
        }
    }

    class ProductionCoordinator {
        constructor() {
            this.arms = [new RobotArmPro('left'), new RobotArmPro('right')];
            this.targets = Array.from(document.querySelectorAll('[data-assemble="true"]'));
            this.isIdle = false;
        }

        async startAll() {
            if (!this.targets.length) return;
            this.render();
            for (let i = 0; i < this.targets.length; i++) {
                const el = this.targets[i];
                const rect = el.getBoundingClientRect();
                const arm = (rect.left + rect.width/2 > window.innerWidth / 2) ? this.arms[1] : this.arms[0];
                if (loaderText) loaderText.textContent = `MOUNTING_SYS_${i+1}`;
                await this.task(arm, el);
            }
            this.isIdle = true;
            this.arms.forEach(arm => {
                let f = setInterval(() => { arm.opacity -= 0.05; if(arm.opacity <= 0.25) { arm.opacity=0.25; clearInterval(f); }}, 100);
            });
        }

        async task(arm, el) {
            const r = el.getBoundingClientRect();
            const tx = r.left + r.width/2, ty = r.top + r.height/2;
            arm.clawOpenness = 1.3; await arm.moveTo(arm.storagePos.x, arm.storagePos.y, 0.35); // Fast but visible
            arm.cargo = { w: r.width, h: r.height }; arm.clawOpenness = 0.5;
            await new Promise(r => setTimeout(r, 80)); // Snappy dwell
            await arm.moveTo(tx, ty - 200, 0.28); await arm.moveTo(tx, ty, 0.35); 
            el.classList.add('assembled', 'active');
            arm.clawOpenness = 1.8; arm.cargo = null;
            await new Promise(r => setTimeout(r, 80)); 
            await arm.moveTo(arm.storagePos.x, arm.storagePos.y, 0.28);
        }

        render() {
            assemblyCanvas.getContext('2d').clearRect(0,0,assemblyCanvas.width, assemblyCanvas.height);
            this.arms.forEach(a => {
                if (this.isIdle) {
                    const sideS = a.side === 'left' ? -250 : 250;
                    const tX = mouseX + sideS; const tY = mouseY;
                    a.currentPos.x += (tX - a.currentPos.x) * 0.02; // Faster mouse follow
                    a.currentPos.y += (tY - a.currentPos.y) * 0.02;
                    a.solveIK(a.currentPos.x, a.currentPos.y, 0.005);
                }
                a.draw();
            });
            requestAnimationFrame(() => this.render());
        }
    }

    if (preloader) {
        setInteraction(false);
        setTimeout(() => {
            preloader.classList.add('granted');
            const pc = new ProductionCoordinator();
            pc.startAll().then(() => {
                setInteraction(true);
                document.querySelectorAll('.reveal, .mastery-card-v2').forEach(el => el.classList.add('active'));
                
                // Force play all videos after intro
                document.querySelectorAll('video').forEach(v => {
                    v.play().catch(err => console.log("Autoplay blocked/failed, trying again..."));
                });
            });
        }, 2000); // Smoother intro start
    }
});
