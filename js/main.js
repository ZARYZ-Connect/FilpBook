/**
 * Premium Flipbook Application
 * Handles loading, rendering, and interactions for StPageFlip.
 */
class FlipbookApp {
    constructor() {
        this.totalPages = 14;
        this.imagesFolderPath = 'assets/images/compressed/';
        this.imageExtension = '.jpg';
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
        this.btnHome = document.getElementById('btn-home');
        this.btnFirst = document.getElementById('btn-first');
        this.btnLast = document.getElementById('btn-last');
        this.btnSound = document.getElementById('btn-sound');
        
        this.pageFlip = null;
        this.soundEnabled = true;
        this.flipAudio = null; // will hold the preloaded Audio element
        
        this.init();
    }

    playFlipSound() {
        if (!this.soundEnabled) return;

        // Lazy-create the Audio element pointing to the real MP3
        if (!this.flipAudio) {
            this.flipAudio = new Audio('assets/audio/new-audio_nMRVg7h1.mp3');
            this.flipAudio.preload = 'auto';
        }

        // Reset to start so overlapping fast flips always play from beginning
        this.flipAudio.currentTime = 0;
        this.flipAudio.play().catch(() => {
            // Autoplay policy: ignore – user interaction already unlocks audio
        });
    }

    async init() {
        await this.resolveAllImages();
        this.pageTotal.textContent = this.totalPages;
        this.initPageFlip();
        this.buildThumbnails();
        this.bindEvents();
        
        this.initSearch();

        // Hide loader quickly - no more waiting for image preloads
        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
        }, 100);
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
        // Instantly build the URL list from compressed JPEGs — no waiting for preload.
        // This removes the 2+ minute wait caused by preloading 22 MB of PNGs.
        this.resolvedImageUrls = [];
        const cacheBuster = "v=1.6"; // Update this string to invalidate browser cache
        for (let i = 1; i <= this.totalPages; i++) {
            this.resolvedImageUrls.push(`${this.imagesFolderPath}Page ${i}${this.imageExtension}?${cacheBuster}`);
        }
        return Promise.resolve();
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
            img.style.objectFit = 'fill';
            img.style.display = 'block';
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
            showPageCorners: true,
            showCover: true,
            mobileScrollSupport: false,
            flippingTime: 1100,
            usePortrait: false  // Force landscape (two-page spread) mode always
        });

        // Use HTML mode instead of Canvas mode
        this.pageFlip.loadFromHTML(this.flipbookEl.querySelectorAll('.st-page'));
        
        // Allow the DOM to render before applying scale
        setTimeout(() => this.resizeToFit(), 50);
    }

    resizeToFit() {
        if (!this.pageFlip) return;
        
        const wrapper = this.wrapperEl;
        // Use sleek 30px margins for maximum book size
        let availableWidth = wrapper.clientWidth - 40; 
        let availableHeight = wrapper.clientHeight - 30;
        
        // Fallback if called before CSS layout resolves completely
        if (availableWidth <= 0) availableWidth = window.innerWidth - 40;
        if (availableHeight <= 0) availableHeight = window.innerHeight - 80;
        
        let bookWidth = 550 * 2;
        let bookHeight = 778;
        let translateX = '-50%';
        
        if (this.pageFlip.getOrientation() === 'portrait') {
            bookWidth = 550;
            availableWidth = wrapper.clientWidth - 20;
            if (availableWidth <= 0) availableWidth = window.innerWidth - 20;
        } else {
            translateX = '-50%';
        }
        
        // Calculate scale to maximize display area
        let scale = Math.min(
            availableWidth / bookWidth,
            availableHeight / bookHeight
        );
        
        // Allow ultra high-res large display (up to 1800px width spread)
        const maxBookWidth = 1800;
        if (bookWidth * scale > maxBookWidth) {
            scale = maxBookWidth / bookWidth;
        }
        
        // Apply CSS transform to scale wrapper element
        this.scaleWrapperEl.style.position = 'absolute';
        this.scaleWrapperEl.style.left = '50%';
        this.scaleWrapperEl.style.top = '50%';
        this.scaleWrapperEl.style.transform = `translate(${translateX}, -50%) scale(${scale})`;
        this.scaleWrapperEl.style.transformOrigin = 'center center';
        
        this.updatePageIndicator();
    }

    updatePageIndicator(pageIndex) {
        if (!this.pageFlip) return;
        const page = (typeof pageIndex === 'number' && !isNaN(pageIndex)) 
            ? pageIndex 
            : this.pageFlip.getCurrentPageIndex();
        const total = this.totalPages;

        if (this.pageFlip.getOrientation() === 'portrait') {
            this.pageCurrent.textContent = Math.min(page + 1, total);
        } else {
            if (page <= 0) {
                this.pageCurrent.textContent = '1';
            } else if (page >= total - 1) {
                this.pageCurrent.textContent = `${total}`;
            } else {
                // Map internal StPageFlip page index to facing spread page numbers (e.g. 2 - 3, 4 - 5, 6 - 7...)
                const leftPageNum = Math.floor((page + 1) / 2) * 2;
                const rightPageNum = leftPageNum + 1;
                
                if (leftPageNum >= total) {
                    this.pageCurrent.textContent = `${total}`;
                } else if (rightPageNum >= total) {
                    this.pageCurrent.textContent = `${leftPageNum}`;
                } else {
                    this.pageCurrent.textContent = `${leftPageNum} - ${rightPageNum}`;
                }
            }
        }
    }

    bindEvents() {
        // Thumbnails Modal Toggle
        if (this.btnThumbnails) {
            this.btnThumbnails.addEventListener('click', () => {
                if (this.thumbnailsOverlay) this.thumbnailsOverlay.classList.remove('hidden');
            });
        }
        
        if (this.thumbnailsClose) {
            this.thumbnailsClose.addEventListener('click', () => {
                if (this.thumbnailsOverlay) this.thumbnailsOverlay.classList.add('hidden');
            });
        }
        
        if (this.thumbnailsOverlay) {
            this.thumbnailsOverlay.addEventListener('click', (e) => {
                if (e.target === this.thumbnailsOverlay) {
                    this.thumbnailsOverlay.classList.add('hidden');
                }
            });
        }

        // Handle window resizing to recalculate strict boundaries
        window.addEventListener('resize', () => {
            this.resizeToFit();
        });

        if (this.pageFlip) {
            // Play sound precisely when the page starts to flip
            this.pageFlip.on('changeState', (e) => {
                if (e.data === 'flipping') {
                    this.playFlipSound();
                }
            });

            // Page Flip Event (updates UI when flip finishes)
            this.pageFlip.on('flip', (e) => {
                this.updatePageIndicator(e ? e.data : null);
                this.resizeToFit();
            });
        }
        
        // Initial state
        this.updatePageIndicator();

        // Button Controls - Previous / Next
        if (this.btnPrev) this.btnPrev.addEventListener('click', () => this.pageFlip && this.pageFlip.flipPrev());
        if (this.btnNext) this.btnNext.addEventListener('click', () => this.pageFlip && this.pageFlip.flipNext());
        
        // Home & First page -> Flip to Front Cover (Page 1)
        if (this.btnHome) this.btnHome.addEventListener('click', () => this.pageFlip && this.pageFlip.turnToPage(0));
        if (this.btnFirst) this.btnFirst.addEventListener('click', () => this.pageFlip && this.pageFlip.turnToPage(0));

        // Last page -> Flip to Page 14 (Back Cover)
        if (this.btnLast) this.btnLast.addEventListener('click', () => this.pageFlip && this.pageFlip.turnToPage(this.totalPages - 1));

        // Sound Toggle
        if (this.btnSound) {
            this.btnSound.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                if (this.soundEnabled) {
                    this.btnSound.innerHTML = '<i class="fas fa-volume-up"></i>';
                } else {
                    this.btnSound.innerHTML = '<i class="fas fa-volume-mute"></i>';
                }
            });
        }

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
        // Lightbox Close Logic
        if (this.lightboxClose && this.lightbox) {
            this.lightboxClose.addEventListener('click', () => {
                this.lightbox.classList.add('hidden');
            });

            this.lightbox.addEventListener('click', (e) => {
                if (e.target === this.lightbox) {
                    this.lightbox.classList.add('hidden');
                }
            });
        }
    }

    openLightbox(src) {
        this.lightboxImg.src = src;
        this.lightbox.classList.remove('hidden');
    }

    /* =====================================================
       SEARCH FUNCTIONALITY
       ===================================================== */
    initSearch() {
        // Keyword index: each entry maps keywords/phrases to the page index (0-based)
        // These are extracted from the actual visual content of each page
        this.searchIndex = [
            // Page 1 — Front Cover
            { page: 0, label: 'Page 1 – Cover', text: 'Zaryz Solutions LLP Company Profile empowering businesses digitally intelligently technology innovation' },
            // Page 2 — About / Services overview
            { page: 1, label: 'Page 2 – About', text: 'About Zaryz digital transformation technology solutions enterprise IT services Bangalore India since 2024 75 clients 55 industry' },
            // Page 3 — IT Infrastructure
            { page: 2, label: 'Page 3 – IT Infrastructure', text: 'IT infrastructure server networking hardware cloud computing structured cabling firewall router switch Wi-Fi enterprise solutions' },
            // Page 4 — ERP & Software
            { page: 3, label: 'Page 4 – ERP & Software', text: 'ERP enterprise resource planning software development custom web application mobile app cloud integration automation workflow' },
            // Page 5 — Surveillance / CCTV
            { page: 4, label: 'Page 5 – Surveillance', text: 'surveillance CCTV NVR DVR Wi-Fi cameras 24/7 monitoring security biometric access control' },
            // Page 6 — Creative Design & Printing
            { page: 5, label: 'Page 6 – Creative Design & Printing', text: 'creative design printing ID cards access badges business cards brochures invitation event materials custom stationery brand identity' },
            // Page 7 — Mobility & Telecom
            { page: 6, label: 'Page 7 – Mobility & Telecom', text: 'mobility solutions device management custom mobile apps mobile security connectivity 5G Wi-Fi telecom infrastructure fiber network wireless global' },
            // Page 8 — Biometric & Intercom
            { page: 7, label: 'Page 8 – Biometric & Intercom', text: 'biometric installation HRMS integration attendance tracking Zoho Keka HR access control intercom wired wireless video CCTV NVR DVR' },
            // Page 9 — Products
            { page: 8, label: 'Page 9 – Products', text: 'products HR management system visitor management system attendance payroll biometric check-in facility analytics enterprise software' },
            // Page 10 — More Products
            { page: 9, label: 'Page 10 – Products cont.', text: 'operation management ticket management service management SLA real-time tracking intelligent automation IT requests facility services' },
            // Page 11 — Contact
            { page: 10, label: 'Page 11 – Contact', text: 'contact us phone +91 90353 50053 email hello@zaryz.com website www.zaryz.com address MHB Nagar Bannerghatta Main Road Bangalore 560083' },
            // Page 12 — Thank You
            { page: 11, label: 'Page 12 – Thank You', text: 'thank you empowering businesses digitally intelligently ZARYZ SOLUTIONS LLP innovate integrate elevate www.zaryz.com hello@zaryz.com Bangalore India' },
            // Pages 13-14 — Back Cover / End
            { page: 12, label: 'Page 13 – Back', text: 'back cover Zaryz Solutions LLP technology solutions' },
            { page: 13, label: 'Page 14 – Back Cover', text: 'back cover end Zaryz Solutions LLP company profile' },
        ];

        // Cache DOM refs
        const panel        = document.getElementById('search-panel');
        const backdrop     = document.getElementById('search-panel-backdrop');
        const closeBtn     = document.getElementById('search-panel-close');
        const panelInput   = document.getElementById('search-panel-input');
        const panelBtn     = document.getElementById('search-panel-btn');
        const resultsBox   = document.getElementById('search-results-container');
        const headerInput  = document.getElementById('search-header-input');
        const headerIcon   = document.getElementById('search-header-icon');

        const openPanel = () => {
            panel.classList.add('open');
            backdrop.classList.add('open');
            // Mirror header input value → panel input
            panelInput.value = headerInput.value;
            panelInput.focus();
            if (panelInput.value.trim()) this.performSearch(panelInput.value.trim(), resultsBox);
            else this.renderSearchPrompt(resultsBox);
        };

        const closePanel = () => {
            panel.classList.remove('open');
            backdrop.classList.remove('open');
        };

        // Open on header input focus or icon click
        headerInput.addEventListener('focus', openPanel);
        headerInput.addEventListener('click', openPanel);
        headerIcon.addEventListener('click', openPanel);

        // Close handlers
        closeBtn.addEventListener('click', closePanel);
        backdrop.addEventListener('click', closePanel);

        // Sync header input → panel input
        headerInput.addEventListener('input', () => {
            panelInput.value = headerInput.value;
            const q = headerInput.value.trim();
            if (q) this.performSearch(q, resultsBox);
            else this.renderSearchPrompt(resultsBox);
        });

        // Live search from panel input
        panelInput.addEventListener('input', () => {
            headerInput.value = panelInput.value;
            const q = panelInput.value.trim();
            if (q) this.performSearch(q, resultsBox);
            else this.renderSearchPrompt(resultsBox);
        });

        // Button search
        panelBtn.addEventListener('click', () => {
            const q = panelInput.value.trim();
            if (q) this.performSearch(q, resultsBox);
        });

        panelInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = panelInput.value.trim();
                if (q) this.performSearch(q, resultsBox);
            }
        });

        // Initial state
        this.renderSearchPrompt(resultsBox);
    }

    renderSearchPrompt(container) {
        container.innerHTML = `<div class="search-prompt">Type a keyword to find pages</div>`;
    }

    highlightText(text, query) {
        if (!query) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(${escaped})`, 'gi');
        return text.replace(re, '<span class="search-highlight">$1</span>');
    }

    performSearch(query, container) {
        const q = query.toLowerCase().trim();
        const matches = [];

        for (const entry of this.searchIndex) {
            if (entry.text.toLowerCase().includes(q)) {
                // Build a snippet around the match
                const lText = entry.text.toLowerCase();
                const idx = lText.indexOf(q);
                const start = Math.max(0, idx - 40);
                const end = Math.min(entry.text.length, idx + q.length + 80);
                let snippet = (start > 0 ? '…' : '') + entry.text.slice(start, end) + (end < entry.text.length ? '…' : '');
                matches.push({ page: entry.page, label: entry.label, snippet });
            }
        }

        if (matches.length === 0) {
            container.innerHTML = `
                <div class="search-empty">
                    <i class="fas fa-search-minus"></i>
                    No results found for "${this.escHtml(query)}"
                </div>`;
            return;
        }

        let html = `<div class="search-found-count">Found <span class="found-num">${matches.length}</span> page${matches.length !== 1 ? 's' : ''}</div>`;

        for (const m of matches) {
            const highlightedSnippet = this.highlightText(this.escHtml(m.snippet), this.escHtml(query));
            html += `
            <div class="search-result-item" data-page="${m.page}">
                <div class="search-result-page">
                    <span class="pg-badge">Pg ${m.page + 1}</span>
                    ${this.escHtml(m.label)}
                </div>
                <div class="search-result-snippet">${highlightedSnippet}</div>
            </div>`;
        }

        container.innerHTML = html;

        // Bind click-to-navigate
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const pageIdx = parseInt(item.dataset.page, 10);
                if (this.pageFlip) {
                    this.pageFlip.flip(pageIdx);
                }
                // Close panel on mobile
                if (window.innerWidth < 768) {
                    document.getElementById('search-panel').classList.remove('open');
                    document.getElementById('search-panel-backdrop').classList.remove('open');
                }
            });
        });
    }

    escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

// Boot application
document.addEventListener('DOMContentLoaded', () => {
    new FlipbookApp();
});
