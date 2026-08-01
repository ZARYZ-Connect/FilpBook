/**
 * Premium Flipbook Application
 * Handles loading, rendering, and interactions for StPageFlip.
 */
class FlipbookApp {
    constructor() {
        this.totalPages = 14;
        this.imagesFolderPath = 'assets/images/';
        this.flipbookEl = document.getElementById('flipbook');
        this.scaleWrapperEl = document.getElementById('flipbook-scale-wrapper');
        this.wrapperEl = document.getElementById('flipbook-container');
        this.loadingScreen = document.getElementById('loading-screen');
        
        // UI Elements
        this.btnPrev = document.getElementById('btn-prev');
        this.btnNext = document.getElementById('btn-next');
        this.btnFullscreen = document.getElementById('btn-fullscreen');
        this.pageCurrent = document.getElementById('page-current');
        this.pageTotal = document.getElementById('page-total');
        
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImg = document.getElementById('lightbox-img');
        this.lightboxClose = document.getElementById('lightbox-close');
        
        this.btnThumbnails = document.getElementById('btn-thumbnails');
        this.thumbnailsOverlay = document.getElementById('thumbnails-overlay');
        this.thumbnailsTrack = document.getElementById('thumbnails-track');
        this.thumbnailsClose = document.getElementById('thumbnails-close');
        
        // New UI Elements
        this.btnSidePrev = document.getElementById('btn-side-prev');
        this.btnSideNext = document.getElementById('btn-side-next');
        this.btnFirst = document.getElementById('btn-first');
        this.btnLast = document.getElementById('btn-last');
        this.btnSound = document.getElementById('btn-sound');
        
        this.pageFlip = null;
        this.audioCtx = null;
        this.soundEnabled = true;
        
        this.init();
    }

    playFlipSound() {
        if (!this.soundEnabled) return;
        
        // Initialize Web Audio API on first use (requires user interaction to unlock)
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        const duration = 0.15;
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate white noise for the paper rustle
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = buffer;
        
        // Bandpass filter to isolate the paper-like mid-high frequencies
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 0.5;
        
        // Envelope to give it a sharp attack and quick decay (crisp page turn)
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.02); // quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration); // decay
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        noiseSource.start();
    }

    async init() {
        await this.resolveAllImages();
        this.pageTotal.textContent = this.totalPages;
        this.initPageFlip();
        this.buildThumbnails();
        this.bindEvents();
        
        // Hide loader after a tiny delay for smooth transition
        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
        }, 400);
    }

    buildThumbnails() {
        this.thumbnailsTrack.innerHTML = '';
        const totalPages = this.totalPages;
        
        let i = 0;
        while (i < totalPages) {
            const item = document.createElement('div');
            item.className = 'thumb-item';
            
            const spread = document.createElement('div');
            spread.className = 'thumb-spread';
            
            let labelText = '';
            let targetPageIndex = i;
            
            // Cover (page 1) or Back Cover (last page) standalone
            if (i === 0 || i === totalPages - 1) {
                const img = document.createElement('img');
                img.src = this.resolvedImageUrls[i];
                img.loading = 'lazy';
                spread.appendChild(img);
                
                labelText = `${i + 1}`;
                i++;
            } else {
                // Two page spread
                const img1 = document.createElement('img');
                img1.src = this.resolvedImageUrls[i];
                img1.loading = 'lazy';
                spread.appendChild(img1);
                
                if (i + 1 < totalPages - 1) {
                    const img2 = document.createElement('img');
                    img2.src = this.resolvedImageUrls[i + 1];
                    img2.loading = 'lazy';
                    spread.appendChild(img2);
                    
                    labelText = `${i + 1}-${i + 2}`;
                    i += 2;
                } else {
                    labelText = `${i + 1}`;
                    i++;
                }
            }
            
            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = labelText;
            
            item.appendChild(spread);
            item.appendChild(label);
            
            item.addEventListener('click', () => {
                this.pageFlip.turnToPage(targetPageIndex);
                this.thumbnailsOverlay.classList.add('hidden');
            });
            
            this.thumbnailsTrack.appendChild(item);
        }
    }

    resolveAllImages() {
        return new Promise((resolve) => {
            const tempUrls = new Array(this.totalPages);
            let loadedCount = 0;
            
            const checkDone = () => {
                loadedCount++;
                if (loadedCount === this.totalPages) {
                    // Filter out skipped or missing pages to compress the book
                    this.resolvedImageUrls = tempUrls.filter(url => url !== null);
                    this.totalPages = this.resolvedImageUrls.length;
                    resolve();
                }
            };

            for (let i = 0; i < this.totalPages; i++) {
                const pageNumber = i + 1;
                
                const formats = [
                    `Page ${pageNumber}.png`,
                    `Page${pageNumber}.png`
                ];
                
                let currentFormatIndex = 0;
                const img = new Image();
                
                const tryNextFormat = () => {
                    if (currentFormatIndex < formats.length) {
                        img.src = encodeURI(`${this.imagesFolderPath}${formats[currentFormatIndex]}`);
                        currentFormatIndex++;
                    } else {
                        // Skip if missing
                        tempUrls[i] = null;
                        checkDone();
                    }
                };

                img.onload = () => {
                    tempUrls[i] = img.src;
                    checkDone();
                };
                
                img.onerror = tryNextFormat;
                
                tryNextFormat();
            }
        });
    }

    initPageFlip() {
        // Build HTML pages dynamically for HTML mode
        this.flipbookEl.innerHTML = '';
        this.resolvedImageUrls.forEach((url, i) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'st-page';
            
            // Set data-density="hard" for cover and back cover
            if (i === 0 || i === this.resolvedImageUrls.length - 1) {
                pageDiv.setAttribute('data-density', 'hard');
            } else {
                pageDiv.setAttribute('data-density', 'soft');
            }
            
            const img = document.createElement('img');
            img.src = url;
            img.className = 'page-image';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.pointerEvents = 'none'; // Prevent drag issues during flip
            
            pageDiv.appendChild(img);
            this.flipbookEl.appendChild(pageDiv);
        });

        this.pageFlip = new St.PageFlip(this.flipbookEl, {
            width: 550, 
            height: 778, 
            size: "fixed",
            drawShadow: true,
            maxShadowOpacity: 0.8,
            showPageCorners: true, // Enables ultra-realistic hovering curl effect
            showCover: true,
            mobileScrollSupport: false,
            flippingTime: 1100, // Slightly slower for majestic inertia feel
            usePortrait: true 
        });

        // Use HTML mode instead of Canvas mode
        this.pageFlip.loadFromHTML(this.flipbookEl.querySelectorAll('.st-page'));
        
        // Allow the DOM to render before applying scale to ensure clientWidth is accurate
        setTimeout(() => this.resizeToFit(), 50);
    }

    resizeToFit() {
        if (!this.pageFlip) return;
        
        const wrapper = this.wrapperEl;
        // Enforce generous margins so it never looks like a standard webpage
        let availableWidth = wrapper.clientWidth - 160; 
        let availableHeight = wrapper.clientHeight - 120;
        
        // Fallback if called before CSS layout resolves completely
        if (availableWidth <= 0) availableWidth = window.innerWidth - 160;
        if (availableHeight <= 0) availableHeight = window.innerHeight - 160;
        
        let bookWidth = 550 * 2;
        let bookHeight = 778;
        let translateX = '-50%';
        
        if (this.pageFlip.getOrientation() === 'portrait') {
            bookWidth = 550;
            // Less extreme margins on mobile portrait so it remains readable
            availableWidth = wrapper.clientWidth - 40;
            if (availableWidth <= 0) availableWidth = window.innerWidth - 40;
        } else {
            // Landscape (double page) mode: center closed cover page
            const currentPage = this.pageFlip.getCurrentPageIndex();
            const totalPages = this.totalPages;
            
            if (currentPage === 0) {
                // Front cover: shift right by 25% of book width (since it renders on the left half)
                translateX = '-25%';
            } else if (currentPage === totalPages - 1) {
                // Back cover: shift left by 25% of book width (since it renders on the right half)
                translateX = '-75%';
            }
        }
        
        // Calculate the exact mathematical scale to fit perfectly
        let scale = Math.min(
            availableWidth / bookWidth,
            availableHeight / bookHeight
        );
        
        // Prevent the book from exceeding a premium catalogue width (~1200px)
        const maxBookWidth = 1200;
        if (bookWidth * scale > maxBookWidth) {
            scale = maxBookWidth / bookWidth;
        }
        
        // Apply CSS transform to the scale wrapper element for flawless, unclipped centering
        this.scaleWrapperEl.style.position = 'absolute';
        this.scaleWrapperEl.style.left = '50%';
        this.scaleWrapperEl.style.top = '50%';
        this.scaleWrapperEl.style.transform = `translate(${translateX}, -50%) scale(${scale})`;
        this.scaleWrapperEl.style.transformOrigin = 'center center';
        
    }

    bindEvents() {
        // Thumbnails Modal Toggle
        this.btnThumbnails.addEventListener('click', () => {
            this.thumbnailsOverlay.classList.remove('hidden');
        });
        
        this.thumbnailsClose.addEventListener('click', () => {
            this.thumbnailsOverlay.classList.add('hidden');
        });
        
        this.thumbnailsOverlay.addEventListener('click', (e) => {
            if (e.target === this.thumbnailsOverlay) {
                this.thumbnailsOverlay.classList.add('hidden');
            }
        });

        // Handle window resizing to recalculate strict boundaries
        window.addEventListener('resize', () => {
            this.resizeToFit();
        });

        // Play sound precisely when the page starts to flip
        this.pageFlip.on('changeState', (e) => {
            if (e.data === 'flipping') {
                this.playFlipSound();
            }
        });

        // Page Flip Event (updates UI when flip finishes)
        this.pageFlip.on('flip', (e) => {
            this.pageCurrent.textContent = e.data + 1;
            this.resizeToFit();
        });
        
        // Initial state
        this.pageCurrent.textContent = this.pageFlip.getCurrentPageIndex() + 1;

        // Button Controls
        this.btnPrev.addEventListener('click', () => this.pageFlip.flipPrev());
        this.btnNext.addEventListener('click', () => this.pageFlip.flipNext());
        
        this.btnSidePrev.addEventListener('click', () => this.pageFlip.flipPrev());
        this.btnSideNext.addEventListener('click', () => this.pageFlip.flipNext());
        
        this.btnFirst.addEventListener('click', () => this.pageFlip.turnToPage(0));
        this.btnLast.addEventListener('click', () => this.pageFlip.turnToPage(this.totalPages - 1));

        // Sound Toggle
        this.btnSound.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            if (this.soundEnabled) {
                this.btnSound.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else {
                this.btnSound.innerHTML = '<i class="fas fa-volume-mute"></i>';
            }
        });

        // Keyboard Controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.pageFlip.flipPrev();
            } else if (e.key === 'ArrowRight') {
                this.pageFlip.flipNext();
            }
        });

        // Fullscreen Toggle
        this.btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Fullscreen Styling Transitions
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.btnFullscreen.innerHTML = '<i class="fas fa-compress"></i>';
                this.wrapperEl.classList.add('fullscreen-zoom');
            } else {
                this.btnFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
                this.wrapperEl.classList.remove('fullscreen-zoom');
            }
        });

        this.bindLightboxEvents();
    }

    bindLightboxEvents() {
        let startX, startY;
        
        // Track pointer down to detect if it's a drag or a click
        this.flipbookEl.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
        }, true);
        
        this.flipbookEl.addEventListener('mouseup', (e) => {
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            
            // If movement is minimal, it's a click, not a page turn drag
            if (dx < 10 && dy < 10) {
                const rect = this.scaleWrapperEl.getBoundingClientRect();
                // Check if click was inside the book container bounds
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    
                    const clickX = e.clientX - rect.left;
                    let pageIndex = this.pageFlip.getCurrentPageIndex();
                    const orientation = this.pageFlip.getOrientation();
                    
                    if (orientation === 'landscape' && pageIndex > 0 && pageIndex < this.totalPages - 1) {
                        // Left or right side of the book?
                        if (clickX > rect.width / 2) {
                            pageIndex += 1; // Clicked right page
                        }
                    }
                    
                    if (pageIndex >= 0 && pageIndex < this.totalPages) {
                        this.openLightbox(this.resolvedImageUrls[pageIndex]);
                    }
                }
            }
        }, true);

        // Lightbox Close Logic
        this.lightboxClose.addEventListener('click', () => {
            this.lightbox.classList.add('hidden');
        });

        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.lightbox.classList.add('hidden');
            }
        });
    }

    openLightbox(src) {
        this.lightboxImg.src = src;
        this.lightbox.classList.remove('hidden');
    }
}

// Boot application
document.addEventListener('DOMContentLoaded', () => {
    new FlipbookApp();
});
