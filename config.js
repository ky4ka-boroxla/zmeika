const CONFIG = {
    gridSize: 20,
    speeds: { easy: 200, medium: 130, hard: 80, insane: 40 },
    minSpeed: 55,
    speedStep: 4,
    speedEvery: 50,
    pointsPerFood: 10,
    goldPoints: 50,
    goldChance: 0.18,
    goldLifetime: 6000,
    comboWindow: 3500,
    comboMax: 5,
    wrap: false,
    musicVolume: 0.35,
    sfxVolume: 0.6,
    storagePrefix: 'snake_v1_'
};

const SKINS = {
    classic: { head: '#ffa502', body: '#00c647', glow: false },
    neon:    { head: '#00eaff', body: '#00ff88', glow: true },
    retro:   { head: '#ffcc00', body: '#00aa33', glow: false, square: true },
    fire:    { head: '#ffd000', body: '#ff3b00', glow: true, gradient: true }
};

const ACHIEVEMENTS = [
    { id: 'first_food',   title: 'Первая кровь',    desc: 'Съешь первую еду' },
    { id: 'len_15',       title: 'Подросток',       desc: 'Змейка из 15 сегментов' },
    { id: 'len_30',       title: 'Длинный',         desc: 'Змейка из 30 сегментов' },
    { id: 'score_100',    title: 'Сотка',           desc: '100 очков' },
    { id: 'score_300',    title: 'Триста',          desc: '300 очков' },
    { id: 'combo_5',      title: 'Комбо-мастер',    desc: 'Комбо ×5' },
    { id: 'gold_eater',   title: 'Золотоискатель',  desc: 'Съешь золотую еду' },
    { id: 'insane_win',   title: 'Безумец',         desc: '100 очков на Хардкоре' },
    { id: 'no_pause',     title: 'Без остановок',   desc: 'Партия без паузы до 200 очков' }
];

const MUSIC_TRACKS_FALLBACK = [
    { title: 'Фоновая музыка', file: 'music/bgm.mp3' }
];