/**
 * Главный контроллер приложения.
 * Связывает UI, Game, Renderer и Strategy.
 */
const App = {
    // DOM elements
    canvasLeft: null,
    canvasRight: null,
    statsEl: null,
    logEl: null,

    // Управление
    isPlaying: false,
    animationTimer: null,
    currentSpeed: 2, // индекс скорости (1-4)

    // Счётчик для batch-режима
    batchRemaining: 0,
    isBatchMode: false,

    /** Инициализация */
    init() {
        this.canvasLeft = document.getElementById('canvas-cycle');
        this.canvasRight = document.getElementById('canvas-random');
        this.statsEl = document.getElementById('stats');
        this.logEl = document.getElementById('log');

        // Устанавливаем размеры канвасов
        this.canvasLeft.width = CONFIG.CANVAS_WIDTH;
        this.canvasLeft.height = CONFIG.CANVAS_HEIGHT;
        this.canvasRight.width = CONFIG.CANVAS_WIDTH;
        this.canvasRight.height = CONFIG.CANVAS_HEIGHT;

        Renderer.init(this.canvasLeft, this.canvasRight);
        Game.reset();

        this._bindUI();
        this._drawIdle();
    },

    /** Привязка UI-элементов */
    _bindUI() {
        document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
        document.getElementById('btn-step').addEventListener('click', () => this.stepOnce());
        document.getElementById('btn-reset').addEventListener('click', () => this.reset());
        document.getElementById('btn-batch').addEventListener('click', () => this.runBatch());

        const speedBtns = document.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentSpeed = parseInt(btn.dataset.speed);
                // Если играет — перезапустить таймер с новой скоростью
                if (this.isPlaying) {
                    this._stopAnimation();
                    this._startAnimation();
                }
            });
        });
    },

    /** Начальное состояние */
    _drawIdle() {
        const idleData = {
            boxes: [],
            prisonerCycle: null,
            prisonerRandom: null,
            cycleDone: 0,
            randomDone: 0,
            cycleTotalSuccess: 0,
            randomTotalSuccess: 0,
            simCycleSuccess: false,
            simRandomSuccess: false,
            phase: 'idle',
            currentCyclePrisoner: 0,
            currentRandomPrisoner: 0,
        };
        Renderer.update(idleData);
        Renderer.draw();
        this._updateStats();
    },

    /** Переключение Play/Pause */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    play() {
        if (Game.phase === 'done' || Game.phase === 'idle') {
            Game.startRound();
        }
        this.isPlaying = true;
        document.getElementById('btn-play').textContent = '⏸';
        this._startAnimation();
    },

    pause() {
        this.isPlaying = false;
        document.getElementById('btn-play').textContent = '▶';
        this._stopAnimation();
    },

    /** Один шаг (одна итерация — один заключённый) */
    stepOnce() {
        if (Game.phase === 'idle' || Game.phase === 'done') {
            Game.startRound();
        }
        this.isPlaying = false;
        document.getElementById('btn-play').textContent = '▶';
        this._stopAnimation();
        this._animateCurrentPrisoner(() => {
            const done = Game.step();
            this._syncRender();
            this._updateStats();
            this._logStep();
            if (done) {
                this._logBatchResult();
                if (this.isBatchMode && this.batchRemaining > 0) {
                    this._continueBatch();
                }
            }
        });
    },

    /** Запустить N заходов подряд */
    runBatch() {
        const count = parseInt(document.getElementById('batch-input').value) || 10;
        this.batchRemaining = count;
        this.isBatchMode = true;
        this.isPlaying = false;
        document.getElementById('btn-play').textContent = '▶';
        this._stopAnimation();
        this._continueBatch();
    },

    _continueBatch() {
        if (this.batchRemaining <= 0) {
            this.isBatchMode = false;
            this._updateStats();
            return;
        }
        this.batchRemaining--;

        const speed = CONFIG.SPEEDS[this.currentSpeed] || 200;
        const delay = this.currentSpeed >= 5 ? 0 : 100;
        const isTurbo = this.currentSpeed >= 5;

        // Запускаем заход и проходим всех заключённых по одному
        Game.startRound();

        const processPrisoners = () => {
            const done = Game.step();
            this._syncRender();
            this._updateStats();

            if (done) {
                // Заход завершён
                this._logBatchResult();
                setTimeout(() => this._continueBatch(), delay);
                return;
            }

            // Анимируем шаги этого заключённого
            const animateP = () => {
                const { cycleDone, randomDone } = Game.animatePrisonerSteps(isTurbo);
                this._syncRender();

                if (cycleDone && randomDone) {
                    Game._cyclePrisonerResult = null;
                    Game._randomPrisonerResult = null;
                    this._logStep();
                    // Сразу к следующему заключённому
                    processPrisoners();
                } else {
                    this._animTimer = setTimeout(animateP, speed);
                }
            };

            animateP();
        };

        processPrisoners();
    },

    /** Логирование итога батча (только результат захода) */
    _logBatchResult() {
        if (!this.logEl) return;
        const stats = Game.getStats();
        const cyclePct = Game.stats.cycleFoundPct || 0;
        const randomPct = Game.stats.randomFoundPct || 0;

        const div = document.createElement('div');
        div.className = 'log-entry log-batch';
        const cycleIcon = cyclePct === 100 ? '✅' : '❌';
        const randomIcon = randomPct === 100 ? '✅' : '❌';
        div.textContent = `[${stats.batchCount}] ${cycleIcon} Цикл: ${cyclePct}% | ${randomIcon} Случ.: ${randomPct}%`;
        this.logEl.appendChild(div);
        this.logEl.scrollTop = this.logEl.scrollHeight;

        while (this.logEl.children.length > 200) {
            this.logEl.removeChild(this.logEl.firstChild);
        }
    },

    /** Сброс */
    reset() {
        this._stopAnimation();
        this.isPlaying = false;
        this.isBatchMode = false;
        this.batchRemaining = 0;
        document.getElementById('btn-play').textContent = '▶';
        Game.reset();
        Renderer.reset();
        this._drawIdle();
        if (this.logEl) this.logEl.innerHTML = '';
    },

    /** Анимация: движется по шагам одного заключённого */
    _animateCurrentPrisoner(onDone) {
        const speed = CONFIG.SPEEDS[this.currentSpeed] || 200;
        const isTurbo = this.currentSpeed >= 5;

        const animate = () => {
            const { cycleDone, randomDone } = Game.animatePrisonerSteps(isTurbo);
            this._syncRender();

            if (cycleDone && randomDone) {
                if (onDone) onDone();
            } else {
                this._animTimer = setTimeout(animate, speed);
            }
        };

        animate();
    },

    /** Непрерывная анимация (Play) */
    _startAnimation() {
        const speed = CONFIG.SPEEDS[this.currentSpeed] || 200;
        const isTurbo = this.currentSpeed >= 5;

        const tick = () => {
            if (!this.isPlaying) return;

            // Если нет активного заключённого — берём следующего
            if (Game._cyclePrisonerResult === null && Game._randomPrisonerResult === null) {
                const done = Game.step();
                this._syncRender();
                this._updateStats();

                if (done) {
                    // Заход завершён — логируем итог
                    this._logBatchResult();

                    // Начинаем новый заход
                    Game.startRound();
                    this._syncRender();
                    this._updateStats();

                    this.animationTimer = setTimeout(tick, speed);
                    return;
                }

                // Анимируем шаги этого заключённого
                const nextTick = () => {
                    const { cycleDone, randomDone } = Game.animatePrisonerSteps(isTurbo);
                    this._syncRender();

                    if (cycleDone && randomDone) {
                        Game._cyclePrisonerResult = null;
                        Game._randomPrisonerResult = null;
                        this._logStep();
                        // Сразу берём следующего — без дополнительного setTimeout
                        this.animationTimer = setTimeout(tick, speed);
                    } else {
                        this.animationTimer = setTimeout(nextTick, speed);
                    }
                };

                this.animationTimer = setTimeout(nextTick, speed);
            } else {
                // Продолжаем анимацию текущего заключённого
                const nextTick = () => {
                    const { cycleDone, randomDone } = Game.animatePrisonerSteps(isTurbo);
                    this._syncRender();

                    if (cycleDone && randomDone) {
                        Game._cyclePrisonerResult = null;
                        Game._randomPrisonerResult = null;
                        this._logStep();
                        this.animationTimer = setTimeout(tick, speed);
                    } else {
                        this.animationTimer = setTimeout(nextTick, speed);
                    }
                };

                this.animationTimer = setTimeout(nextTick, speed);
            }
        };

        // Запускаем первый раз
        if (Game.phase === 'idle') {
            Game.startRound();
            this._syncRender();
        }

        this.animationTimer = setTimeout(tick, speed);
    },

    _animatePrisonerSteps(callback) {
        const speed = CONFIG.SPEEDS[this.currentSpeed] || 200;
        const isTurbo = this.currentSpeed >= 5;

        const step = () => {
            const { cycleDone, randomDone } = Game.animatePrisonerSteps(isTurbo);
            this._syncRender();

            if (cycleDone && randomDone) {
                Game._cyclePrisonerResult = null;
                Game._randomPrisonerResult = null;
                if (callback) callback();
            } else {
                this.animationTimer = setTimeout(step, speed);
            }
        };

        this.animationTimer = setTimeout(step, speed);
    },

    _startNextBatchRound() {
        this.batchRemaining--;
        Game.startRound();
        this._syncRender();
        this._updateStats();
    },

    /** Остановить анимацию */
    _stopAnimation() {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        if (this._animTimer) {
            clearTimeout(this._animTimer);
            this._animTimer = null;
        }
    },

    /** Обновить рендерер и нарисовать */
    _syncRender() {
        Renderer.update(Game.getRenderData());
        Renderer.draw();
    },

    /** Обновить панель статистики */
    _updateStats() {
        if (!this.statsEl) return;
        const stats = Game.getStats();
        const foundC = Game.stats.cycleFoundPct || 0;
        const foundR = Game.stats.randomFoundPct || 0;
        this.statsEl.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">Заходов:</span>
                <span class="stat-value">${stats.batchCount}</span>
            </div>
            <div class="stat-group">
                <div class="stat-item cycle">
                    <span class="stat-label">Циклы:</span>
                    <span class="stat-value ${stats.cycleRate >= 30 ? 'success' : 'fail'}">
                        ${stats.cycleSuccess}/${stats.cycleTotal}
                        (${stats.cycleRate}%)
                    </span>
                    <span class="stat-detail">нашли ${foundC}%</span>
                </div>
                <div class="stat-item random">
                    <span class="stat-label">Случайная:</span>
                    <span class="stat-value ${stats.randomRate > 0 ? 'success' : 'fail'}">
                        ${stats.randomSuccess}/${stats.randomTotal}
                        (${stats.randomRate}%)
                    </span>
                    <span class="stat-detail">нашли ${foundR}%</span>
                </div>
            </div>
        `;
    },

    /** Логирование шага */
    _logStep() {
        if (!this.logEl) return;
        const cycleP = Game._cyclePrisonerResult || Game.cycleResults[Game.currentPrisonerIndex - 1];
        const randomP = Game._randomPrisonerResult || Game.randomResults[Game.currentPrisonerIndex - 1];

        if (!cycleP && !randomP) return;

        const div = document.createElement('div');
        div.className = 'log-entry';

        const num = cycleP ? cycleP.prisoner : randomP.prisoner;
        let text = `Закл. #${String(num).padStart(3)}`;

        if (cycleP) {
            const icon = cycleP.found ? '✅' : '❌';
            text += ` | ${icon} Цикл: ${cycleP.found ? 'нашёл' : 'не нашёл'} (${cycleP.steps} шаг.)`;
        }
        if (randomP) {
            const icon = randomP.found ? '✅' : '❌';
            text += ` | ${icon} Случ.: ${randomP.found ? 'нашёл' : 'не нашёл'} (${randomP.steps} шаг.)`;
        }

        div.textContent = text;
        this.logEl.appendChild(div);
        this.logEl.scrollTop = this.logEl.scrollHeight;

        // Ограничим лог 200 строками
        while (this.logEl.children.length > 200) {
            this.logEl.removeChild(this.logEl.firstChild);
        }
    },
};

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => App.init());
