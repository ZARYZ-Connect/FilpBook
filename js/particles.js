/**
 * Zaryz Theme - Warp Speed / Radiating Particles Background
 * A highly optimized Vanilla JS Canvas animation.
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    let width, height, cx, cy;
    let particles = [];
    
    // Zaryz Brand Colors
    const colors = ['#00b4d8', '#ff9e00', '#0077b6'];
    
    // Mouse tracking for parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetCx = 0;
    let targetCy = 0;

    const PARTICLE_COUNT = 400;
    const Z_MAX = 2000;
    const SPEED = 5;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        
        // Base center point
        cx = width / 2;
        cy = height / 2;
        targetCx = cx;
        targetCy = cy;
    }

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(randomZ = false) {
            // Spread particles across a wide 3D space
            this.x = (Math.random() - 0.5) * width * 3;
            this.y = (Math.random() - 0.5) * height * 3;
            this.z = randomZ ? Math.random() * Z_MAX : Z_MAX;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.size = Math.random() * 1.5 + 0.5;
            this.pastZ = this.z;
        }

        update() {
            this.pastZ = this.z;
            this.z -= SPEED;

            if (this.z <= 0) {
                this.reset();
            }
        }

        draw() {
            // Project 3D coordinates to 2D screen space
            const fov = 300;
            
            // Current projection
            const scale = fov / this.z;
            const px = cx + this.x * scale;
            const py = cy + this.y * scale;

            // Past projection (for the streak effect)
            const pastScale = fov / this.pastZ;
            const pastPx = cx + this.x * pastScale;
            const pastPy = cy + this.y * pastScale;

            // Calculate opacity based on depth (fade in from distance)
            const opacity = Math.max(0, 1 - (this.z / Z_MAX));

            ctx.beginPath();
            ctx.moveTo(pastPx, pastPy);
            ctx.lineTo(px, py);
            
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = this.size * scale;
            
            // Add a slight glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            
            ctx.stroke();
            
            // Reset shadow to avoid performance hit on next drawing operations
            ctx.shadowBlur = 0;
        }
    }

    function init() {
        resize();
        window.addEventListener('resize', resize);

        // Parallax mouse effect
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Calculate how much the center should shift based on mouse position
            // Shift is subtle (divided by 20)
            targetCx = (width / 2) + (mouseX - width / 2) * 0.05;
            targetCy = (height / 2) + (mouseY - height / 2) * 0.05;
        });

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }

        animate();
    }

    function animate() {
        // Smoothly interpolate current center towards target center for fluid parallax
        cx += (targetCx - cx) * 0.1;
        cy += (targetCy - cy) * 0.1;

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }

        requestAnimationFrame(animate);
    }

    init();
});
