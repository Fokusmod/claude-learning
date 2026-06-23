/**
 * Конфигурация симуляции "100 заключённых и 100 ящиков"
 */
const CONFIG = {
    // Количество заключённых / ящиков
    PRISONER_COUNT: 100,
    BOX_COUNT: 100,
    // Максимум шагов на одного заключённого
    MAX_STEPS: 50,

    // Размеры канвасов
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 540,

    // Параметры сетки ящиков
    BOX_COLS: 10,
    BOX_ROWS: 10,
    BOX_SIZE: 40,
    BOX_GAP: 6,

    // Смещение сетки на канвасе
    GRID_OFFSET_X: 50,
    GRID_OFFSET_Y: 60,

    // Скорости анимации (мс на шаг)
    SPEEDS: {
        1: 400,
        2: 200,
        3: 80,
        4: 20,
        5: 4,    // ×50 — почти без задержки
    },

    // Порог турбо-скорости (начиная с 5 — ×50, без покадровой анимации)

    // Цветовая палитра (8-bit NES-стиль)
    COLORS: {
        BG_DARK: '#1a1a2e',
        BG_MID: '#16213e',
        BG_LIGHT: '#0f3460',

        BOX_CLOSED: '#8b7355',
        BOX_CLOSED_BORDER: '#6b5b3e',
        BOX_OPEN: '#3a3a5c',
        BOX_OPEN_BORDER: '#2a2a4c',
        BOX_FOUND: '#4ecca3',
        BOX_NOT_FOUND: '#e94560',

        PRISONER: '#ffd369',
        PRISONER_GLOW: '#ffd36966',

        TEXT_PRIMARY: '#e8e8e8',
        TEXT_SECONDARY: '#a0a0b0',
        TEXT_ACCENT: '#ffd369',
        TEXT_SUCCESS: '#4ecca3',
        TEXT_FAIL: '#e94560',

        PROGRESS_BG: '#2a2a4c',
        PROGRESS_FILL: '#4ecca3',
        PROGRESS_FAIL: '#e94560',

        LABEL_CYCLE: '#4ecca3',
        LABEL_RANDOM: '#ffd369',
    },
};
