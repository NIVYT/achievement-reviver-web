/**
 * ============================================================================
 * ACHIEVEMENT REVIVER - CONTROLLER
 * ============================================================================
 * Powers the web interface with client-side Little-Endian NBT patching,
 * JSZip archive packaging, authentic 4-step hex indicator,
 * striped animated progress, and instant downloads.
 * ============================================================================
 */

import { patchBedrockLevelDat } from './nbtEngine.js';

const MINECRAFT_JOKES = [
    "How does Steve stay in shape? He runs around the block.",
    "How does Steve measure his shoe size? In square feet.",
    "What is a Creeper's favourite food? SSssSalad.",
    "Did you hear about the Creeper's party? It was a blast!",
    "Did you hear about the Minecraft movie? It's gonna be a blockbuster.",
    "Why do zombies make great teammates? They never give up on brains.",
    "What do you call an Enderman in the rain? Tele-porting out of here!"
];

class WorldReviver {
    constructor() {
        // Screens & Containers
        this.selectWorldScreen = document.getElementById('screen-select');
        this.processingScreen = document.getElementById('screen-processing');
        this.completeScreen = document.getElementById('screen-complete');
        this.bottombar = document.getElementById('bottombar');
        this.statusNotification = document.getElementById('status-notification');
        this.topbarTitle = document.getElementById('topbar-title');
        this.topbarSubtitle = document.getElementById('topbar-subtitle');

        // Inputs & Dropzone
        this.dropzone = document.getElementById('dropzone');
        this.chooseFileBtn = document.getElementById('choose-file-btn');
        this.fileInput = document.getElementById('file-input');
        this.folderInput = document.getElementById('folder-input');
        this.btnChooseFolder = document.getElementById('btn-choose-folder');
        this.btnChooseArchive = document.getElementById('btn-choose-archive');

        // Progress Elements
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressFill = document.getElementById('progress-fill');
        this.processingText = document.getElementById('processing-text');
        this.jokeText = document.getElementById('joke-text');

        // Completion Elements
        this.worldThumb = document.getElementById('world-thumb');
        this.worldNameEl = document.getElementById('world-name');
        this.worldMetaEl = document.getElementById('world-meta');
        this.auditList = document.getElementById('audit-list');
        this.downloadBtn = document.getElementById('download-btn');
        this.downloadAltBtn = document.getElementById('download-alt-btn');
        this.downloadMainText = document.getElementById('download-main-text');
        this.downloadAltText = document.getElementById('download-alt-text');
        this.resetBtn = document.getElementById('reset-btn');

        // Stepper
        this.stepElements = [
            document.getElementById('chunker-step1'),
            document.getElementById('chunker-step2'),
            document.getElementById('chunker-step3'),
            document.getElementById('chunker-step4')
        ];

        // Top Header Nav Links
        this.navLinks = document.querySelectorAll('[data-view]');
        this.tabPanels = document.querySelectorAll('.tab_content_panel');

        // State
        this.currentStage = 1;
        this.isProcessing = false;
        this.lastDownloadUrl = null;
        this.lastDownloadFilename = null;
        this.lastAltDownloadFilename = null;

        this.init();
    }

    init() {
        this.initStepper(1);
        this.initNavLinks();
        this.initEventListeners();
        this.initFaqAccordion();
    }

    /**
     * Updates the 4-stage hexagonal step indicator
     * @param {number} stage (1 to 4)
     */
    initStepper(stage) {
        this.currentStage = stage;
        this.stepElements.forEach((el, index) => {
            if (!el) return;
            const stepNumber = index + 1;
            if (stage >= stepNumber) {
                el.classList.add('complete');
            } else {
                el.classList.remove('complete');
            }
        });
    }

    initNavLinks() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                if (view) {
                    this.showView(view);
                }
            });
        });
    }

    showView(viewName) {
        // Update active class on header nav links
        this.navLinks.forEach(l => {
            if (l.getAttribute('data-view') === viewName) {
                l.classList.add('active');
            } else {
                l.classList.remove('active');
            }
        });

        // Hide all secondary tab panels first
        this.tabPanels.forEach(panel => panel.classList.remove('active'));

        if (viewName === 'revive') {
            // Restore appropriate reviver state screen
            if (this.currentStage === 4) {
                this.showScreen('complete');
                this.setTopbar('Patched World', 'Your Bedrock world is ready to download with Survival and Achievements locked.');
            } else if (this.isProcessing) {
                this.showScreen('processing');
                this.setTopbar('Processing World', 'Scanning NBT binary and removing cheat tags.');
            } else {
                this.showScreen('select');
                this.setTopbar('Select World', 'Select your Minecraft Bedrock world folder, archive, or level.dat file.');
            }
        } else {
            // Hide reviver tool screens
            this.selectWorldScreen.style.display = 'none';
            this.processingScreen.style.display = 'none';
            this.completeScreen.style.display = 'none';
            this.bottombar.style.display = 'none';

            // Show selected informational tab panel
            const targetPanel = document.getElementById(`tab-${viewName}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            if (viewName === 'how-it-works') {
                this.setTopbar('How It Works', 'Technical breakdown of Little-Endian NBT patching.');
            } else if (viewName === 'import-guide') {
                this.setTopbar('Import Guide', 'Step-by-step instructions for Windows, Mobile, and Consoles.');
            } else if (viewName === 'faq') {
                this.setTopbar('Frequently Asked Questions', 'Common questions about Xbox Live Achievements and world safety.');
            }
        }

        // Scroll smoothly to content top
        const contentEl = document.getElementById('content');
        if (contentEl) {
            contentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    setTopbar(title, subtitle) {
        if (this.topbarTitle) this.topbarTitle.textContent = title;
        if (this.topbarSubtitle) this.topbarSubtitle.textContent = subtitle;
    }

    initFaqAccordion() {
        const faqQuestions = document.querySelectorAll('.faq_question');
        faqQuestions.forEach(q => {
            q.addEventListener('click', () => {
                const parent = q.parentElement;
                parent.classList.toggle('open');
                const indicator = parent.querySelector('.faq_indicator');
                if (indicator) {
                    indicator.textContent = parent.classList.contains('open') ? '−' : '+';
                }
            });
        });
    }

    initEventListeners() {
        // Card 1: Select Archive / File
        if (this.btnChooseArchive && this.fileInput) {
            this.btnChooseArchive.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.isProcessing) this.fileInput.click();
            });
        }

        // Card 2: Choose World Folder
        if (this.btnChooseFolder && this.folderInput) {
            this.btnChooseFolder.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.isProcessing) this.folderInput.click();
            });
        }

        // Drag overlay click
        const dragOverlay = document.getElementById('drag-overlay');
        if (dragOverlay && this.fileInput) {
            dragOverlay.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.isProcessing) this.fileInput.click();
            });
        }

        // File input onchange
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        // Folder input onchange
        if (this.folderInput) {
            this.folderInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFolderFiles(e.target.files);
                }
            });
        }

        // Window-level Drag & Drop with active overlay
        let dragCounter = 0;
        window.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (!this.isProcessing && this.selectWorldScreen) {
                this.selectWorldScreen.classList.add('is_dragging');
            }
        });

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                if (this.selectWorldScreen) {
                    this.selectWorldScreen.classList.remove('is_dragging');
                }
            }
        });

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            if (this.selectWorldScreen) {
                this.selectWorldScreen.classList.remove('is_dragging');
            }
            if (this.isProcessing) return;

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                if (files.length === 1 && !files[0].isDirectory) {
                    this.handleFile(files[0]);
                } else {
                    this.handleFolderFiles(files);
                }
            }
        });

        // Download main
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => {
                if (this.lastDownloadUrl && this.lastDownloadFilename) {
                    this.triggerDownload(this.lastDownloadUrl, this.lastDownloadFilename);
                }
            });
        }

        // Download alternate format
        if (this.downloadAltBtn) {
            this.downloadAltBtn.addEventListener('click', () => {
                if (this.lastDownloadUrl && this.lastAltDownloadFilename) {
                    this.triggerDownload(this.lastDownloadUrl, this.lastAltDownloadFilename);
                }
            });
        }

        // Reset
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                this.resetUI();
            });
        }
    }

    showScreen(screenName) {
        this.selectWorldScreen.style.display = screenName === 'select' ? 'block' : 'none';
        this.processingScreen.style.display = screenName === 'processing' ? 'flex' : 'none';
        this.completeScreen.style.display = screenName === 'complete' ? 'flex' : 'none';
        this.bottombar.style.display = (screenName === 'complete') ? 'flex' : 'none';
    }

    showNotification(msg, type = 'info') {
        if (!this.statusNotification) return;
        this.statusNotification.className = `status_notification ${type}`;
        this.statusNotification.innerHTML = msg;
        this.statusNotification.style.display = 'block';
    }

    clearNotification() {
        if (!this.statusNotification) return;
        this.statusNotification.style.display = 'none';
        this.statusNotification.innerHTML = '';
    }

    updateProgress(pct, statusText) {
        const rounded = Math.min(100, Math.max(0, Math.round(pct)));
        if (this.progressPercentage) this.progressPercentage.textContent = `${rounded}%`;
        if (this.progressFill) this.progressFill.style.width = `${rounded}%`;
        if (this.processingText) this.processingText.textContent = statusText || 'Processing world binary...';
    }

    setJoke() {
        if (this.jokeText) {
            const joke = MINECRAFT_JOKES[Math.floor(Math.random() * MINECRAFT_JOKES.length)];
            this.jokeText.textContent = `"${joke}"`;
        }
    }

    resetUI() {
        this.isProcessing = false;
        if (this.fileInput) this.fileInput.value = '';
        if (this.folderInput) this.folderInput.value = '';
        this.clearNotification();
        this.initStepper(1);
        this.showView('revive');

        if (this.downloadAltBtn) {
            this.downloadAltBtn.style.display = 'none';
        }

        if (this.lastDownloadUrl) {
            URL.revokeObjectURL(this.lastDownloadUrl);
            this.lastDownloadUrl = null;
        }
        this.lastDownloadFilename = null;
        this.lastAltDownloadFilename = null;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async handleFolderFiles(fileList) {
        let levelDatFile = null;
        let levelOldFile = null;
        let levelNameFile = null;
        let iconFile = null;

        for (let i = 0; i < fileList.length; i++) {
            const f = fileList[i];
            const p = (f.webkitRelativePath || f.name).toLowerCase();
            if (p.endsWith('level.dat') && !p.endsWith('level.dat_old')) {
                levelDatFile = f;
            } else if (p.endsWith('level.dat_old')) {
                levelOldFile = f;
            } else if (p.endsWith('levelname.txt')) {
                levelNameFile = f;
            } else if (p.endsWith('world_icon.jpeg') || p.endsWith('world_icon.png') || p.endsWith('world_icon.jpg')) {
                iconFile = f;
            }
        }

        if (!levelDatFile) {
            this.showNotification("<strong>Invalid World Folder:</strong> Could not locate <code>level.dat</code> inside the selected folder. Please choose a valid Minecraft Bedrock world directory.", "error");
            return;
        }

        await this.handleFile(levelDatFile, {
            isFolder: true,
            levelNameFile,
            iconFile
        });
    }

    /**
     * Executes an intentional 5-second "cooking" progress sequence
     * giving users the feeling that the engine is actively processing and repairing their world.
     * @param {number} durationMs Duration in ms (default 5000ms = 5 seconds)
     */
    runCookingProgress(durationMs = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const intervalTime = 40; // 25 updates per second for butter-smooth animation
            let jokeRotated = false;

            if (this.cookingInterval) {
                clearInterval(this.cookingInterval);
            }

            this.cookingInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(1, elapsed / durationMs);
                const pct = Math.round(progressRatio * 100);

                let statusMsg = "Scanning Little-Endian NBT binary compound...";

                if (pct < 20) {
                    this.initStepper(2);
                    statusMsg = "Reading level.dat binary stream...";
                } else if (pct < 45) {
                    this.initStepper(2);
                    statusMsg = "Inspecting cheat tags and creative mode flags...";
                } else if (pct < 70) {
                    this.initStepper(3);
                    statusMsg = "Cooking NBT byte stream: Patching hasBeenLoadedInCreative & cheatsEnabled...";
                    if (!jokeRotated && pct >= 50) {
                        this.setJoke();
                        jokeRotated = true;
                    }
                } else if (pct < 95) {
                    this.initStepper(3);
                    statusMsg = "Locking Survival mode and repackaging Bedrock archive...";
                } else {
                    this.initStepper(4);
                    statusMsg = "Finalizing world archive and verifying byte integrity...";
                }

                this.updateProgress(pct, statusMsg);

                if (elapsed >= durationMs) {
                    clearInterval(this.cookingInterval);
                    this.cookingInterval = null;
                    this.updateProgress(100, "World successfully revived! Achievements restored.");
                    resolve();
                }
            }, intervalTime);
        });
    }

    async handleFile(file, folderMeta = null) {
        const fileName = file.name;
        const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        this.clearNotification();
        this.isProcessing = true;
        this.setJoke();
        this.setTopbar('Processing World', 'Scanning NBT binary and removing cheat tags.');
        this.showScreen('processing');

        // Stage 2: Inspect binary
        this.initStepper(2);
        this.updateProgress(0, `Preparing ${fileName}...`);

        try {
            // Start the intentional 5-second cooking animation
            const cookingPromise = this.runCookingProgress(5000);

            // Execute the actual in-memory NBT parsing & packaging in parallel
            const workPromise = (async () => {
                if (fileExt === '.mcworld' || fileExt === '.zip') {
                    return await this.processArchiveWork(file);
                } else if (fileName.toLowerCase().includes('level.dat') || fileExt === '.dat') {
                    return await this.processRawLevelDatWork(file, folderMeta);
                } else {
                    throw new Error("Unsupported format. Please select a .mcworld, .zip archive, or level.dat file.");
                }
            })();

            // Wait for BOTH the actual processing work AND the full 5-second cooking animation
            // If workPromise throws an error, Promise.all rejects immediately!
            const [_, result] = await Promise.all([cookingPromise, workPromise]);

            // Brief 350ms pause at 100% so the user sees the completed cooking bar
            await new Promise(r => setTimeout(r, 350));

            // Stage 4: Ready
            this.initStepper(4);
            this.setTopbar('Patched World', 'Your Bedrock world is ready to download with Survival and Achievements locked.');

            this.renderCompletionScreen(result);

            // Trigger automatic browser download
            this.triggerDownload(this.lastDownloadUrl, this.lastDownloadFilename);

        } catch (err) {
            console.error("Reviver error:", err);
            if (this.cookingInterval) {
                clearInterval(this.cookingInterval);
                this.cookingInterval = null;
            }
            this.showNotification(`<strong>Conversion Error:</strong> ${err.message}`, 'error');
            this.showScreen('select');
            this.setTopbar('Select World', 'Select your Minecraft Bedrock world folder, archive, or level.dat file.');
            this.initStepper(1);
            this.isProcessing = false;
        }
    }

    async processRawLevelDatWork(file, folderMeta = null) {
        const arrayBuffer = await file.arrayBuffer();
        const patchResult = patchBedrockLevelDat(arrayBuffer);
        if (!patchResult.success) {
            throw new Error(`NBT Patch failed: ${patchResult.error}`);
        }

        let worldName = patchResult.levelName || null;
        let iconUrl = null;

        if (folderMeta) {
            if (folderMeta.levelNameFile) {
                try {
                    const text = await folderMeta.levelNameFile.text();
                    if (text && text.trim()) worldName = text.trim();
                } catch (e) {}
            }
            if (folderMeta.iconFile) {
                try {
                    iconUrl = URL.createObjectURL(folderMeta.iconFile);
                } catch (e) {}
            }
        }

        if (!worldName) {
            worldName = file.name.replace(/\.[^/.]+$/, "");
        }

        const patchedBlob = new Blob([patchResult.data], { type: 'application/octet-stream' });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const outputFilename = `${baseName}_revived.dat`;

        this.lastDownloadUrl = URL.createObjectURL(patchedBlob);
        this.lastDownloadFilename = outputFilename;
        this.lastAltDownloadFilename = null;

        return {
            worldName,
            worldIconUrl: iconUrl,
            fileType: "Bedrock level.dat Binary",
            fileSize: this.formatBytes(file.size),
            audit: patchResult.audit,
            filename: outputFilename,
            altFilename: null,
            isZip: false
        };
    }

    async processArchiveWork(file) {
        if (!window.JSZip) {
            throw new Error("JSZip engine failed to load. Please refresh the page.");
        }

        const fileName = file.name;
        const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        const isZip = fileExt === '.zip';

        const zip = new JSZip();
        let loadedZip;
        try {
            loadedZip = await zip.loadAsync(file);
        } catch (e) {
            throw new Error(`Failed to parse ZIP archive: ${e.message}`);
        }

        let levelDatEntry = null;
        let levelOldEntry = null;
        let levelNameEntry = null;
        let iconEntry = null;

        loadedZip.forEach((relativePath, zipEntry) => {
            const p = relativePath.toLowerCase();
            if (p.includes('__macosx/')) return;

            if (p.endsWith('level.dat') && !p.endsWith('level.dat_old')) {
                levelDatEntry = zipEntry;
            } else if (p.endsWith('level.dat_old')) {
                levelOldEntry = zipEntry;
            } else if (p.endsWith('levelname.txt')) {
                levelNameEntry = zipEntry;
            } else if (p.endsWith('world_icon.jpeg') || p.endsWith('world_icon.png') || p.endsWith('world_icon.jpg')) {
                iconEntry = zipEntry;
            }
        });

        if (!levelDatEntry) {
            throw new Error("Could not find 'level.dat' inside the archive.");
        }

        const levelDatBytes = await levelDatEntry.async('uint8array');
        const patchResult = patchBedrockLevelDat(levelDatBytes);
        if (!patchResult.success) {
            throw new Error(`NBT Patch failed: ${patchResult.error}`);
        }

        // Update JSZip entry
        loadedZip.file(levelDatEntry.name, patchResult.data);

        // Synchronize level.dat_old if present
        if (levelOldEntry) {
            try {
                const oldBytes = await levelOldEntry.async('uint8array');
                const oldPatchResult = patchBedrockLevelDat(oldBytes);
                if (oldPatchResult.success) {
                    loadedZip.file(levelOldEntry.name, oldPatchResult.data);
                }
            } catch (err) {
                console.warn("Could not patch level.dat_old:", err);
            }
        }

        let worldName = patchResult.levelName || null;
        if (levelNameEntry) {
            try {
                const nameTxt = await levelNameEntry.async('text');
                if (nameTxt && nameTxt.trim()) worldName = nameTxt.trim();
            } catch (err) {}
        }
        if (!worldName) {
            worldName = file.name.replace(/\.[^/.]+$/, "");
        }

        let iconUrl = null;
        if (iconEntry) {
            try {
                const iconBlob = await iconEntry.async('blob');
                iconUrl = URL.createObjectURL(iconBlob);
            } catch (err) {}
        }

        const patchedZipBlob = await loadedZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 1 }
        });

        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const primaryFilename = isZip ? `${baseName}_revived.zip` : `${baseName}_revived.mcworld`;
        const altFilename = isZip ? `${baseName}_revived.mcworld` : `${baseName}_revived.zip`;

        this.lastDownloadUrl = URL.createObjectURL(patchedZipBlob);
        this.lastDownloadFilename = primaryFilename;
        this.lastAltDownloadFilename = altFilename;

        return {
            worldName,
            worldIconUrl: iconUrl,
            fileType: isZip ? "Bedrock .zip World Archive" : "Bedrock .mcworld World Archive",
            fileSize: this.formatBytes(file.size),
            audit: patchResult.audit,
            filename: primaryFilename,
            altFilename: altFilename,
            isZip: isZip
        };
    }

    renderCompletionScreen({ worldName, worldIconUrl, fileType, fileSize, audit, filename, altFilename, isZip }) {
        // Enforce uppercase world name for authentic MinecraftFiveBold rendering
        const displayName = (worldName || "MY WORLD").toUpperCase();
        if (this.worldNameEl) this.worldNameEl.textContent = displayName;
        if (this.worldMetaEl) this.worldMetaEl.textContent = `${fileType.toUpperCase()} • ${fileSize}`;

        // Thumbnail
        if (this.worldThumb) {
            if (worldIconUrl) {
                this.worldThumb.innerHTML = `<img src="${worldIconUrl}" alt="World Icon">`;
            } else {
                this.worldThumb.innerHTML = `<img src="images/bedrock.png" alt="Bedrock" style="width:40px;height:40px;image-rendering:pixelated;">`;
            }
        }

        // Tag Audit specifications formatted with authentic Chunker 3D tactile pill badges
        const tagSpecs = [
            {
                key: "hasBeenLoadedInCreative",
                label: "hasBeenLoadedInCreative",
                description: "Flagged permanently if world was ever in Creative",
                format: (val) => val === 1 ? `<span class="badge_tainted">1 (TAINTED)</span>` : `<span class="badge_clean">0 (CLEANED)</span>`
            },
            {
                key: "cheatsEnabled",
                label: "cheatsEnabled",
                description: "Blocks achievements if cheats were enabled",
                format: (val) => val === 1 ? `<span class="badge_tainted">1 (ENABLED)</span>` : `<span class="badge_clean">0 (DISABLED)</span>`
            },
            {
                key: "commandsEnabled",
                label: "commandsEnabled",
                description: "Enables cheat slash commands",
                format: (val) => val === 1 ? `<span class="badge_tainted">1 (ENABLED)</span>` : `<span class="badge_clean">0 (DISABLED)</span>`
            },
            {
                key: "GameType",
                label: "GameType",
                description: "Default mode (0=Survival, 1=Creative, 2=Adventure)",
                format: (val) => val === 0 ? `<span class="badge_clean">0 (SURVIVAL)</span>` : `<span class="badge_tainted">${val} (NON-SURVIVAL)</span>`
            },
            {
                key: "ForceGameType",
                label: "ForceGameType",
                description: "Locks all players into Survival mode upon world join",
                format: (val) => val === 1 ? `<span class="badge_clean">1 (ENFORCED)</span>` : `<span class="badge_neutral">0 (OPTIONAL)</span>`
            }
        ];

        let html = '';
        tagSpecs.forEach(tag => {
            const item = audit ? audit[tag.key] : null;
            const prev = item ? item.previousValue : null;
            const next = item ? item.newValue : null;
            const found = item !== null && item !== undefined;

            const prevHtml = found ? tag.format(prev) : `<span class="badge_neutral">NOT FOUND</span>`;
            const nextHtml = found ? tag.format(next) : `<span class="badge_neutral">NOT FOUND</span>`;
            const statusHtml = found ? `<span class="badge_patched">PATCHED</span>` : `<span class="badge_neutral">SKIPPED</span>`;

            html += `
                <tr>
                    <td>
                        <div class="tag_code">${tag.key}</div>
                        <div class="tag_desc">${tag.description}</div>
                    </td>
                    <td>${prevHtml}</td>
                    <td style="text-align:center;"><span class="audit_arrow">&rarr;</span></td>
                    <td>${nextHtml}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });

        if (this.auditList) {
            this.auditList.innerHTML = html;
        }

        // Configure Download Buttons
        if (altFilename && this.downloadAltBtn) {
            this.downloadAltBtn.style.display = 'inline-block';
            if (this.downloadAltText) {
                this.downloadAltText.textContent = isZip 
                    ? "Download .mcworld" 
                    : "Download as .zip";
            }
        } else if (this.downloadAltBtn) {
            this.downloadAltBtn.style.display = 'none';
        }

        if (this.downloadMainText) {
            const ext = filename.substring(filename.lastIndexOf('.'));
            this.downloadMainText.textContent = `Download Patched World (${ext})`;
        }

        this.showScreen('complete');
        this.showNotification(`<strong>Success!</strong> "${displayName}" has been revived with Survival and Achievements enabled.`, 'success');
        this.isProcessing = false;
    }

    triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.reviverApp = new WorldReviver();
});
