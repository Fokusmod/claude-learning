/**
 * 8-битный Canvas-рендерер.
 * Рисует две арены, ящики, заключённых, прогресс-бары.
 */
const Renderer = {
    /** @type {CanvasRenderingContext2D} */
    ctxLeft: null,
    ctxRight: null,

    // Текущие данные для отрисовки
    _boxes: [],
    _prisonerCycle: null,  // { prisoner, found, steps, path, currentStepIdx }
    _prisonerRandom: null,
    _cycleDone: 0,
    _randomDone: 0,
    _cycleTotalSuccess: 0,
    _randomTotalSuccess: 0,
    _simCycleSuccess: false,
    _simRandomSuccess: false,
    _phase: 'idle', // idle | running | done
    _currentCyclePrisoner: 0,
    _currentRandomPrisoner: 0,

    /**
     * Инициализация канвасов.
     * @param {HTMLCanvasElement} leftCanvas
     * @param {HTMLCanvasElement} rightCanvas
     */
    init(leftCanvas, rightCanvas) {
        this.ctxLeft = leftCanvas.getContext('2d');
        this.ctxRight = rightCanvas.getContext('2d');
        this.reset();
    },

    reset() {
        this._boxes = [];
        this._prisonerCycle = null;
        this._prisonerRandom = null;
        this._cycleDone = 0;
        this._randomDone = 0;
        this._cycleTotalSuccess = 0;
        this._randomTotalSuccess = 0;
        this._simCycleSuccess = false;
        this._simRandomSuccess = false;
        this._phase = 'idle';
        this._currentCyclePrisoner = 0;
        this._currentRandomPrisoner = 0;
    },

    /**
     * Обновить данные для следующего кадра.
     */
    update(data) {
        this._boxes = data.boxes || [];
        this._prisonerCycle = data.prisonerCycle || null;
        this._prisonerRandom = data.prisonerRandom || null;
        this._cycleDone = data.cycleDone || 0;
        this._randomDone = data.randomDone || 0;
        this._cycleTotalSuccess = data.cycleTotalSuccess || 0;
        this._randomTotalSuccess = data.randomTotalSuccess || 0;
        this._simCycleSuccess = data.simCycleSuccess || false;
        this._simRandomSuccess = data.simRandomSuccess || false;
        this._phase = data.phase || 'idle';
        this._currentCyclePrisoner = data.currentCyclePrisoner || 0;
        this._currentRandomPrisoner = data.currentRandomPrisoner || 0;
    },

    /** Отрисовка обоих канвасов */
    draw() {
        this._drawCanvas(this.ctxLeft, 'cycle', CONFIG.COLORS.LABEL_CYCLE);
        this._drawCanvas(this.ctxRight, 'random', CONFIG.COLORS.LABEL_RANDOM);
    },

    /**
     * Рисует один канвас.
     * @param {CanvasRenderingContext2D} ctx
     * @param {'cycle'|'random'} type
     * @param {string} accentColor
     */
    _drawCanvas(ctx, type, accentColor) {
        const W = CONFIG.CANVAS_WIDTH;
        const H = CONFIG.CANVAS_HEIGHT;

        // Фон
        ctx.fillStyle = CONFIG.COLORS.BG_DARK;
        ctx.fillRect(0, 0, W, H);

        // Пиксельная рамка
        this._drawPixelBorder(ctx, 0, 0, W, H, accentColor);

        // Заголовок
        const title = type === 'cycle' ? 'ЦИКЛЫ' : 'СЛУЧАЙНАЯ';
        ctx.fillStyle = accentColor;
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(title, W / 2, 28);

        // Сетка ящиков
        this._drawBoxGrid(ctx, type);

        // Информация о текущем заключённом
        this._drawPrisonerInfo(ctx, type, accentColor);

        // Прогресс-бар
        this._drawProgressBar(ctx, type);
    },

    /** Рамка в пиксельном стиле */
    _drawPixelBorder(ctx, x, y, w, h, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        ctx.strokeStyle = CONFIG.COLORS.TEXT_SECONDARY;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    },

    /** Рисует сетку 10×10 ящиков */
    _drawBoxGrid(ctx, type) {
        const { BOX_COLS, BOX_ROWS, BOX_SIZE, BOX_GAP, GRID_OFFSET_X, GRID_OFFSET_Y } = CONFIG;

        for (let row = 0; row < BOX_ROWS; row++) {
            for (let col = 0; col < BOX_COLS; col++) {
                const idx = row * BOX_COLS + col;
                const x = GRID_OFFSET_X + col * (BOX_SIZE + BOX_GAP);
                const y = GRID_OFFSET_Y + row * (BOX_SIZE + BOX_GAP);

                // Определяем состояние ящика
                let isOpen = false;
                let isFound = false;
                let isCurrentTarget = false;

                const prisonerData = type === 'cycle' ? this._prisonerCycle : this._prisonerRandom;

                if (prisonerData && idx < prisonerData.path.length) {
                    const stepIdx = Math.min(prisonerData.currentStepIdx, prisonerData.path.length - 1);
                    const openedIndices = prisonerData.path.slice(0, stepIdx + 1);
                    if (openedIndices.includes(idx)) {
                        isOpen = true;
                        const foundIndex = prisonerData.path[prisonerData.path.length - 1];
                        const isFinalFound = prisonerData.found;
                        if (idx === foundIndex) {
                            isFound = isFinalFound;
                        }
                    }
                    // Подсветка текущего ящика только если ещё идёт анимация (не финальный шаг)
                    const isLastStep = prisonerData.currentStepIdx >= prisonerData.path.length - 1;
                    if (prisonerData.path.length > 0 && !isLastStep && prisonerData.currentStepIdx < CONFIG.MAX_STEPS) {
                        const currentIdx = prisonerData.path[Math.min(prisonerData.currentStepIdx, prisonerData.path.length - 1)];
                        isCurrentTarget = (idx === currentIdx);
                    }
                }

                this._drawBox(ctx, x, y, BOX_SIZE, idx, isOpen, isFound, isCurrentTarget);
            }
        }
    },

    /** Рисует один ящик */
    _drawBox(ctx, x, y, size, index, isOpen, isFound, isCurrent) {
        const pad = 2;

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 3, y + 3, size, size);

        if (isOpen) {
            // Открытый ящик
            ctx.fillStyle = isFound ? CONFIG.COLORS.BOX_FOUND : CONFIG.COLORS.BOX_OPEN;
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = isFound ? CONFIG.COLORS.TEXT_SUCCESS : CONFIG.COLORS.BOX_OPEN_BORDER;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);

            // Показываем номер внутри
            ctx.fillStyle = isFound ? '#1a1a2e' : CONFIG.COLORS.TEXT_SECONDARY;
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const boxValue = this._boxes[index] || 0;
            ctx.fillText(String(boxValue).padStart(2, '0'), x + size / 2, y + size / 2);
        } else {
            // Закрытый ящик — рисуем доски
            ctx.fillStyle = CONFIG.COLORS.BOX_CLOSED;
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = CONFIG.COLORS.BOX_CLOSED_BORDER;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);

            // Пиксельные "доски" — вертикальные линии
            ctx.strokeStyle = CONFIG.COLORS.BOX_CLOSED_BORDER;
            ctx.lineWidth = 1;
            const boardCount = 4;
            for (let i = 1; i < boardCount; i++) {
                const bx = x + (size / boardCount) * i;
                ctx.beginPath();
                ctx.moveTo(bx, y + pad);
                ctx.lineTo(bx, y + size - pad);
                ctx.stroke();
            }

            // Номер ящика маленький сверху
            ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(String(index + 1).padStart(2, '0'), x + size / 2, y + 2);
        }

        // Подсветка текущего ящика
        if (isCurrent) {
            ctx.strokeStyle = CONFIG.COLORS.PRISONER_GLOW;
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
        }

        ctx.textBaseline = 'alphabetic';
    },

    /** Информация о текущем заключённом */
    _drawPrisonerInfo(ctx, type, accentColor) {
        const prisonerData = type === 'cycle' ? this._prisonerCycle : this._prisonerRandom;
        const done = type === 'cycle' ? this._cycleDone : this._randomDone;
        const current = type === 'cycle' ? this._currentCyclePrisoner : this._currentRandomPrisoner;

        // Верхняя информационная строка
        ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'left';

        if (this._phase === 'idle') {
            ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
            ctx.fillText('ОЖИДАНИЕ...', 10, CONFIG.CANVAS_HEIGHT - 25);
            return;
        }

        if (this._phase === 'done') {
            const success = type === 'cycle' ? this._simCycleSuccess : this._simRandomSuccess;
            ctx.fillStyle = success ? CONFIG.COLORS.TEXT_SUCCESS : CONFIG.COLORS.TEXT_FAIL;
            ctx.fillText(success ? 'УСПЕХ!' : 'ПРОВАЛ', 10, CONFIG.CANVAS_HEIGHT - 25);
            return;
        }

        // running
        if (current > 0) {
            ctx.fillStyle = accentColor;
            ctx.fillText(`#${String(current).padStart(3, ' ')}`, 10, CONFIG.CANVAS_HEIGHT - 25);
        }

        if (prisonerData) {
            const stepText = `шаг ${prisonerData.currentStepIdx + 1}/${CONFIG.MAX_STEPS}`;
            ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
            ctx.textAlign = 'right';
            ctx.fillText(stepText, CONFIG.CANVAS_WIDTH - 10, CONFIG.CANVAS_HEIGHT - 25);

            // Пиксельный спрайт заключённого
            this._drawPrisonerSprite(ctx, 20, CONFIG.CANVAS_HEIGHT - 60, accentColor);
        }

        ctx.textAlign = 'left';
    },

    /** Маленький пиксельный спрайт заключённого */
    _drawPrisonerSprite(ctx, x, y, color) {
        const p = 3; // pixel size
        // Пиксельная фигурка 5×7 "человечек"
        const sprite = [
            '  #  ',
            ' ### ',
            ' # # ',
            ' ### ',
            '  #  ',
            ' # # ',
            '#   #',
        ];

        ctx.fillStyle = color;
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                if (sprite[row][col] === '#') {
                    ctx.fillRect(x + col * p, y + row * p, p, p);
                }
            }
        }
    },

    /** Прогресс-бар */
    _drawProgressBar(ctx, type) {
        const barX = 10;
        const barY = CONFIG.CANVAS_HEIGHT - 45;
        const barW = CONFIG.CANVAS_WIDTH - 20;
        const barH = 12;

        const done = type === 'cycle' ? this._cycleDone : this._randomDone;
        const total = CONFIG.PRISONER_COUNT;
        const pct = total > 0 ? done / total : 0;

        // Фон
        ctx.fillStyle = CONFIG.COLORS.PROGRESS_BG;
        ctx.fillRect(barX, barY, barW, barH);

        // Заполнение
        if (pct > 0) {
            ctx.fillStyle = CONFIG.COLORS.PROGRESS_FILL;
            ctx.fillRect(barX, barY, Math.floor(barW * pct), barH);
        }

        // Рамка
        ctx.strokeStyle = CONFIG.COLORS.TEXT_SECONDARY;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // Текст
        ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${done}/${total}`, barX + barW / 2, barY + barH / 2);

        ctx.textBaseline = 'alphabetic';
    },
};
