/**
 * Логика стратегий: циклическая (классическая) и случайная.
 */

const Strategy = {
    /**
     * Создаёт случайную перестановку номеров в ящиках.
     * @returns {number[]} массив длиной 100, boxes[i] = номер в i-м ящике
     */
    shuffleBoxes() {
        const arr = Array.from({ length: CONFIG.BOX_COUNT }, (_, i) => i + 1);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /**
     * Циклическая стратегия.
     * Заключённый начинает с ящика = свой номер, затем идёт по циклу.
     *
     * @param {number} prisonerNumber номер заключённого (1-based)
     * @param {number[]} boxes массив номеров в ящиках
     * @returns {{ found: boolean, steps: number, path: number[] }}
     */
    cycle(prisonerNumber, boxes) {
        const path = [];
        let currentBox = prisonerNumber; // начинаем со своего номера
        let steps = 0;

        while (steps < CONFIG.MAX_STEPS) {
            const boxIndex = currentBox - 1;
            const foundNumber = boxes[boxIndex];
            path.push(boxIndex);
            steps++;

            if (foundNumber === prisonerNumber) {
                return { found: true, steps, path };
            }
            currentBox = foundNumber; // идём к ящику с этим номером
        }

        return { found: false, steps, path };
    },

    /**
     * Случайная стратегия.
     * Заключённый открывает 50 случайных ящиков.
     *
     * @param {number} prisonerNumber номер заключённого (1-based)
     * @param {number[]} boxes массив номеров в ящиках
     * @returns {{ found: boolean, steps: number, path: number[] }}
     */
    random(prisonerNumber, boxes) {
        // Перемешиваем индексы ящиков
        const indices = Array.from({ length: CONFIG.BOX_COUNT }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const path = [];
        let steps = 0;

        for (const boxIndex of indices) {
            if (steps >= CONFIG.MAX_STEPS) break;
            path.push(boxIndex);
            steps++;
            if (boxes[boxIndex] === prisonerNumber) {
                return { found: true, steps, path };
            }
        }

        return { found: false, steps, path };
    },

    /**
     * Запускает одну полную симуляцию для обеих стратегий на одних ящиках.
     *
     * @returns {{
     *   boxes: number[],
     *   results: {
     *     cycle: { prisonerResults: Array<{ prisoner: number, found: boolean, steps: number, path: number[] }>, success: boolean },
     *     random: { prisonerResults: Array<{ prisoner: number, found: boolean, steps: number, path: number[] }>, success: boolean }
     *   }
     * }}
     */
    runFullSimulation() {
        const boxes = this.shuffleBoxes();

        const cycleResults = [];
        const randomResults = [];

        for (let i = 1; i <= CONFIG.PRISONER_COUNT; i++) {
            cycleResults.push({
                prisoner: i,
                ...this.cycle(i, boxes),
            });
            randomResults.push({
                prisoner: i,
                ...this.random(i, boxes),
            });
        }

        const cycleSuccess = cycleResults.every(r => r.found);
        const randomSuccess = randomResults.every(r => r.found);

        return {
            boxes,
            results: {
                cycle: { prisonerResults: cycleResults, success: cycleSuccess },
                random: { prisonerResults: randomResults, success: randomSuccess },
            },
        };
    },
};
