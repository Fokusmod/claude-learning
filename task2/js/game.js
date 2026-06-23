/**
 * Состояние симуляции.
 * Управляет туром, текущим заключённым, накопленной статистикой.
 */
const Game = {
    // Текущий прогон
    boxes: [],
    cycleResults: [],
    randomResults: [],

    // Какого заключённого сейчас обрабатываем (0 = ещё не начали)
    currentPrisonerIndex: 0,

    // Текущий шаг внутри одного заключённого
    currentCycleStep: 0,
    currentRandomStep: 0,

    // Сколько заключённых уже завершили
    cycleDone: 0,
    randomDone: 0,

    // Успешность текущего захода
    simCycleSuccess: false,
    simRandomSuccess: false,

    // Фаза симуляции
    phase: 'idle', // idle | running | done

    // Статистика за всё время
    stats: {
        cycleTotal: 0,      // сколько заходов сделано (циклы)
        cycleSuccess: 0,    // сколько успешных
        randomTotal: 0,
        randomSuccess: 0,
        batchCount: 0,      // сколько всего заходов
        cycleFoundPct: 0,   // процент нашедших за последний заход (циклы)
        randomFoundPct: 0,  // процент нашедших за последний заход (случайная)
    },

    // Текущие prisoners для отображения
    currentCyclePrisoner: 0,
    currentRandomPrisoner: 0,

    // Результаты от предыдущего шага (для сравнительной статистики)
    _cyclePrisonerResult: null,
    _randomPrisonerResult: null,

    /** Полный сброс (новая серия) */
    reset() {
        this.boxes = [];
        this.cycleResults = [];
        this.randomResults = [];
        this.currentPrisonerIndex = 0;
        this.currentCycleStep = 0;
        this.currentRandomStep = 0;
        this.cycleDone = 0;
        this.randomDone = 0;
        this.simCycleSuccess = false;
        this.simRandomSuccess = false;
        this.phase = 'idle';
        this.currentCyclePrisoner = 0;
        this.currentRandomPrisoner = 0;
        this._cyclePrisonerResult = null;
        this._randomPrisonerResult = null;
    },

    /** Сброс без обнуления глобальной статистики */
    resetRound() {
        this.boxes = [];
        this.cycleResults = [];
        this.randomResults = [];
        this.currentPrisonerIndex = 0;
        this.currentCycleStep = 0;
        this.currentRandomStep = 0;
        this.cycleDone = 0;
        this.randomDone = 0;
        this.simCycleSuccess = false;
        this.simRandomSuccess = false;
        this.phase = 'idle';
        this.currentCyclePrisoner = 0;
        this.currentRandomPrisoner = 0;
        this._cyclePrisonerResult = null;
        this._randomPrisonerResult = null;
    },

    /** Начать новый заход */
    startRound() {
        this.resetRound();

        // Перемешиваем ящики один раз на заход (обе стратегии работают с одними ящиками)
        this.boxes = Strategy.shuffleBoxes();
        this.phase = 'running';

        // Предварительно вычисляем результаты для обеих стратегий (без анимации)
        for (let i = 1; i <= CONFIG.PRISONER_COUNT; i++) {
            this.cycleResults.push({
                prisoner: i,
                ...Strategy.cycle(i, this.boxes),
            });
            this.randomResults.push({
                prisoner: i,
                ...Strategy.random(i, this.boxes),
            });
        }

        this.simCycleSuccess = this.cycleResults.every(r => r.found);
        this.simRandomSuccess = this.randomResults.every(r => r.found);

        // Перемешиваем порядок отображения для случайной стратегии (для интереса),
        // но оставляем оригинал для статистики
        // Показываем в порядке возрастания номеров
        return this;
    },

    /**
     * Шагнуть на одного заключённого.
     * @returns {boolean} true если заход завершён
     */
    step() {
        if (this.phase !== 'running') return true;

        if (this.currentPrisonerIndex >= CONFIG.PRISONER_COUNT) {
            this.phase = 'done';
            // Обновляем глобальную статистику
            this.stats.cycleTotal++;
            if (this.simCycleSuccess) this.stats.cycleSuccess++;
            this.stats.randomTotal++;
            if (this.simRandomSuccess) this.stats.randomSuccess++;
            this.stats.batchCount++;
            // Процент нашедших за этот заход
            this.stats.cycleFoundPct = Math.round(
                (this.cycleResults.filter(r => r.found).length / CONFIG.PRISONER_COUNT) * 100
            );
            this.stats.randomFoundPct = Math.round(
                (this.randomResults.filter(r => r.found).length / CONFIG.PRISONER_COUNT) * 100
            );
            return true;
        }

        // Берём следующи комплект результатов
        this._cyclePrisonerResult = this.cycleResults[this.currentPrisonerIndex];
        this._randomPrisonerResult = this.randomResults[this.currentPrisonerIndex];

        this.currentCyclePrisoner = this.cycleResults[this.currentPrisonerIndex].prisoner;
        this.currentRandomPrisoner = this.randomResults[this.currentPrisonerIndex].prisoner;

        this.currentCycleStep = 0;
        this.currentRandomStep = 0;
        this.currentPrisonerIndex++;

        // После шага проверяем, не последний ли
        if (this.currentPrisonerIndex >= CONFIG.PRISONER_COUNT) {
            this.cycleDone = CONFIG.PRISONER_COUNT;
            this.randomDone = CONFIG.PRISONER_COUNT;
            this.phase = 'done';
            this.stats.cycleTotal++;
            if (this.simCycleSuccess) this.stats.cycleSuccess++;
            this.stats.randomTotal++;
            if (this.simRandomSuccess) this.stats.randomSuccess++;
            this.stats.batchCount++;
            // Процент нашедших за этот заход
            this.stats.cycleFoundPct = Math.round(
                (this.cycleResults.filter(r => r.found).length / CONFIG.PRISONER_COUNT) * 100
            );
            this.stats.randomFoundPct = Math.round(
                (this.randomResults.filter(r => r.found).length / CONFIG.PRISONER_COUNT) * 100
            );
            return true;
        }

        this.cycleDone = this.currentPrisonerIndex;
        this.randomDone = this.currentPrisonerIndex;

        return false;
    },

    /**
     * Анимировать шаги внутри одного заключённого (для покадровой отрисовки).
     * На высоких скоростях (5+) пропускает все шаги сразу.
     * @returns {{ cycleDone: boolean, randomDone: boolean }} true если заключённый завершил
     */
    animatePrisonerSteps(isTurbo) {
        let cycleDone = false;
        let randomDone = false;

        if (isTurbo) {
            // На ×50 — пропускаем все шаги мгновенно
            if (this._cyclePrisonerResult) {
                this.currentCycleStep = this._cyclePrisonerResult.path.length - 1;
                cycleDone = true;
            } else {
                cycleDone = true;
            }
            if (this._randomPrisonerResult) {
                this.currentRandomStep = this._randomPrisonerResult.path.length - 1;
                randomDone = true;
            } else {
                randomDone = true;
            }
        } else {
            // Обычная покадровая анимация
            if (this._cyclePrisonerResult && this.currentCycleStep < this._cyclePrisonerResult.path.length - 1) {
                this.currentCycleStep++;
            } else {
                cycleDone = true;
            }

            if (this._randomPrisonerResult && this.currentRandomStep < this._randomPrisonerResult.path.length - 1) {
                this.currentRandomStep++;
            } else {
                randomDone = true;
            }
        }

        return { cycleDone, randomDone };
    },

    /**
     * Получить данные для рендерера на текущий кадр.
     */
    getRenderData() {
        const prisonerCycle = this._cyclePrisonerResult ? {
            ...this._cyclePrisonerResult,
            currentStepIdx: Math.min(this.currentCycleStep, this._cyclePrisonerResult.path.length - 1),
        } : null;

        const prisonerRandom = this._randomPrisonerResult ? {
            ...this._randomPrisonerResult,
            currentStepIdx: Math.min(this.currentRandomStep, this._randomPrisonerResult.path.length - 1),
        } : null;

        return {
            boxes: this.boxes,
            prisonerCycle,
            prisonerRandom,
            cycleDone: this.cycleDone,
            randomDone: this.randomDone,
            cycleTotalSuccess: this.stats.cycleSuccess,
            randomTotalSuccess: this.stats.randomSuccess,
            simCycleSuccess: this.simCycleSuccess,
            simRandomSuccess: this.simRandomSuccess,
            phase: this.phase,
            currentCyclePrisoner: this.currentCyclePrisoner,
            currentRandomPrisoner: this.currentRandomPrisoner,
        };
    },

    /**
     * Получить глобальную статистику.
     */
    getStats() {
        const cycleRate = this.stats.cycleTotal > 0
            ? Math.round((this.stats.cycleSuccess / this.stats.cycleTotal) * 100)
            : 0;
        const randomRate = this.stats.randomTotal > 0
            ? Math.round((this.stats.randomSuccess / this.stats.randomTotal) * 100)
            : 0;

        return {
            ...this.stats,
            cycleRate,
            randomRate,
        };
    },
};
