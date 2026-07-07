// Shared domain constants. Mirror kept in frontend/src/constants.js.

export const FEDERATIONS = ['KAZ', 'WDF'];

// Cities available per federation (used for the dependent location dropdown).
export const CITIES_BY_FEDERATION = {
  KAZ: [
    'Almaty',
    'Astana',
    'Shymkent',
    'Karaganda',
    'Aktobe',
    'Taraz',
    'Pavlodar',
    'Oskemen',
    'Semey',
    'Atyrau',
    'Kostanay',
    'Kyzylorda',
    'Oral',
    'Petropavl',
    'Aktau',
    'Turkistan',
    'Kokshetau',
    'Taldykorgan',
  ],
  WDF: [
    'Istanbul',
    'Bishkek',
    'Tashkent',
    'Ulaanbaatar',
    'Moscow',
    'Kazan',
    'Baku',
    'Ankara',
    'Dushanbe',
    'Ashgabat',
  ],
};

export const LEVELS = ['International', 'National', 'Regional', 'School', 'Test'];

export const RATING_TYPES = ['blitz', 'rapid', 'classic', 'non_rated'];

// Column on users that a given tournament rating_type updates.
export const RATING_COLUMN = {
  blitz: 'rating_blitz',
  rapid: 'rating_rapid',
  classic: 'rating_classic',
};

// All accepted match result codes. The first three are rated (feed Elo);
// the rest record points but never affect ratings.
export const RATED_RESULTS = ['1-0', '0-1', '0.5-0.5'];
export const NON_RATED_RESULTS = ['+--', '--+', '=-=', '---'];
export const ALL_RESULTS = [...RATED_RESULTS, ...NON_RATED_RESULTS];

// Points awarded to (player1, player2) per result code.
export const POINTS = {
  '1-0': [1, 0],
  '0-1': [0, 1],
  '0.5-0.5': [0.5, 0.5],
  '+--': [1, 0],
  '--+': [0, 1],
  '=-=': [0.5, 0.5],
  '---': [0, 0],
};
