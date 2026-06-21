/* ========================================
   QR Forge — Application Logic
   ======================================== */

(() => {
    'use strict';

    // --- DOM References ---
    const elements = {
        content: document.getElementById('qr-content'),
        charCount: document.getElementById('char-count'),
        fgColor: document.getElementById('fg-color'),
        bgColor: document.getElementById('bg-color'),
        fgHex: document.getElementById('fg-color-hex'),
        bgHex: document.getElementById('bg-color-hex'),
        swapColors: document.getElementById('swap-colors'),
        size: document.getElementById('qr-size'),
        sizeValue: document.getElementById('size-value'),
        canvas: document.getElementById('qr-canvas'),
        canvasWrapper: document.getElementById('qr-canvas-wrapper'),
        placeholder: document.getElementById('qr-placeholder'),
        downloadPng: document.getElementById('download-png'),
        downloadSvg: document.getElementById('download-svg'),
        copyBtn: document.getElementById('copy-btn'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message'),
    };

    // --- State ---
    let state = {
        content: 'https://example.com',
        fgColor: '#ffffff',
        bgColor: '#0a0a1a',
        size: 256,
        ecLevel: 'M',
    };

    let debounceTimer = null;

    // --- QR Code Generation ---
    function generateQR() {
        const { content, fgColor, bgColor, size, ecLevel } = state;

        if (!content.trim()) {
            elements.canvasWrapper.classList.remove('visible');
            elements.placeholder.classList.remove('hidden');
            return;
        }

        try {
            // qrcode-generator library: typeNumber 0 = auto, ecLevel must be a string ('L','M','Q','H')
            const qr = qrcode(0, ecLevel);
            qr.addData(content);
            qr.make();

            const moduleCount = qr.getModuleCount();
            const canvas = elements.canvas;
            const ctx = canvas.getContext('2d');

            // Set canvas size
            canvas.width = size;
            canvas.height = size;

            const cellSize = size / moduleCount;

            // Draw background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, size, size);

            // Draw QR modules
            ctx.fillStyle = fgColor;
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            col * cellSize,
                            row * cellSize,
                            cellSize + 0.5,  // slight overlap to prevent gaps
                            cellSize + 0.5
                        );
                    }
                }
            }

            elements.canvasWrapper.classList.add('visible');
            elements.placeholder.classList.add('hidden');
        } catch (err) {
            console.error('QR generation error:', err);
            showToast('Content too long for selected error correction level');
        }
    }

    function debouncedGenerate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(generateQR, 150);
    }

    // --- Content Input ---
    elements.content.addEventListener('input', () => {
        state.content = elements.content.value;
        updateCharCount();
        debouncedGenerate();
    });

    function updateCharCount() {
        const len = state.content.length;
        // Max capacity at EC level L with alphanumeric is 4296, but byte mode is 2953
        const max = 2953;
        elements.charCount.textContent = `${len} / ${max}`;
        elements.charCount.style.color = len > max ? '#e17055' : '';
    }

    // --- Templates ---
    const templates = {
        url: 'https://example.com',
        email: 'mailto:hello@example.com',
        phone: 'tel:+1234567890',
        wifi: 'WIFI:T:WPA;S:NetworkName;P:Password123;;',
        text: 'Hello, World!',
    };

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const templateKey = chip.dataset.template;
            if (templates[templateKey]) {
                elements.content.value = templates[templateKey];
                state.content = templates[templateKey];
                updateCharCount();
                generateQR();

                // Visual feedback
                chip.style.background = 'rgba(124, 108, 240, 0.2)';
                chip.style.borderColor = 'rgba(124, 108, 240, 0.4)';
                setTimeout(() => {
                    chip.style.background = '';
                    chip.style.borderColor = '';
                }, 300);
            }
        });
    });

    // --- Color Controls ---
    function syncColors(source) {
        if (source === 'picker-fg') {
            state.fgColor = elements.fgColor.value;
            elements.fgHex.value = elements.fgColor.value;
        } else if (source === 'picker-bg') {
            state.bgColor = elements.bgColor.value;
            elements.bgHex.value = elements.bgColor.value;
        } else if (source === 'hex-fg') {
            const val = elements.fgHex.value;
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                state.fgColor = val;
                elements.fgColor.value = val;
            }
        } else if (source === 'hex-bg') {
            const val = elements.bgHex.value;
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                state.bgColor = val;
                elements.bgColor.value = val;
            }
        }
        debouncedGenerate();
    }

    elements.fgColor.addEventListener('input', () => syncColors('picker-fg'));
    elements.bgColor.addEventListener('input', () => syncColors('picker-bg'));
    elements.fgHex.addEventListener('input', () => syncColors('hex-fg'));
    elements.bgHex.addEventListener('input', () => syncColors('hex-bg'));

    // Swap colors
    elements.swapColors.addEventListener('click', () => {
        const tempFg = state.fgColor;
        state.fgColor = state.bgColor;
        state.bgColor = tempFg;

        elements.fgColor.value = state.fgColor;
        elements.bgColor.value = state.bgColor;
        elements.fgHex.value = state.fgColor;
        elements.bgHex.value = state.bgColor;

        generateQR();
    });

    // Preset swatches
    document.querySelectorAll('.preset-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            state.fgColor = swatch.dataset.fg;
            state.bgColor = swatch.dataset.bg;

            elements.fgColor.value = state.fgColor;
            elements.bgColor.value = state.bgColor;
            elements.fgHex.value = state.fgColor;
            elements.bgHex.value = state.bgColor;

            generateQR();
        });
    });

    // --- Size Slider ---
    elements.size.addEventListener('input', () => {
        state.size = parseInt(elements.size.value, 10);
        elements.sizeValue.textContent = `${state.size} × ${state.size}`;
        debouncedGenerate();
    });

    // --- Error Correction ---
    document.querySelectorAll('.ec-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ec-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.ecLevel = btn.dataset.level;
            generateQR();
        });
    });

    // --- Download PNG ---
    elements.downloadPng.addEventListener('click', () => {
        if (!state.content.trim()) {
            showToast('Enter content first');
            return;
        }
        const link = document.createElement('a');
        link.download = `qr-forge-${Date.now()}.png`;
        link.href = elements.canvas.toDataURL('image/png');
        link.click();
        showToast('PNG downloaded!');
    });

    // --- Download SVG ---
    elements.downloadSvg.addEventListener('click', () => {
        if (!state.content.trim()) {
            showToast('Enter content first');
            return;
        }

        try {
            const qr = qrcode(0, state.ecLevel);
            qr.addData(state.content);
            qr.make();

            const moduleCount = qr.getModuleCount();
            const cellSize = state.size / moduleCount;

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${state.size}" height="${state.size}" viewBox="0 0 ${state.size} ${state.size}">`;
            svg += `<rect width="${state.size}" height="${state.size}" fill="${state.bgColor}"/>`;

            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        svg += `<rect x="${(col * cellSize).toFixed(2)}" y="${(row * cellSize).toFixed(2)}" width="${(cellSize + 0.5).toFixed(2)}" height="${(cellSize + 0.5).toFixed(2)}" fill="${state.fgColor}"/>`;
                    }
                }
            }

            svg += '</svg>';

            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `qr-forge-${Date.now()}.svg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            showToast('SVG downloaded!');
        } catch (err) {
            console.error('SVG export error:', err);
            showToast('Error generating SVG');
        }
    });

    // --- Copy to Clipboard ---
    elements.copyBtn.addEventListener('click', async () => {
        if (!state.content.trim()) {
            showToast('Enter content first');
            return;
        }

        try {
            const blob = await new Promise(resolve =>
                elements.canvas.toBlob(resolve, 'image/png')
            );
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('QR code copied to clipboard!');
        } catch (err) {
            // Fallback: copy as data URL
            try {
                await navigator.clipboard.writeText(elements.canvas.toDataURL('image/png'));
                showToast('QR code data URL copied!');
            } catch (e) {
                showToast('Copy failed — try downloading instead');
            }
        }
    });

    // --- Toast Notification ---
    let toastTimer = null;
    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2500);
    }

    // --- Initialize ---
    updateCharCount();
    generateQR();

})();
