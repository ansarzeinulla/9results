// Mirror of backend/src/shared/constants.js for dropdowns.

export const FEDERATIONS = ['KAZ', 'WDF'];

export const CITIES_BY_FEDERATION = {
  KAZ: [
    'Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe', 'Taraz', 'Pavlodar',
    'Oskemen', 'Semey', 'Atyrau', 'Kostanay', 'Kyzylorda', 'Oral', 'Petropavl',
    'Aktau', 'Turkistan', 'Kokshetau', 'Taldykorgan',
  ],
  WDF: [
    'Istanbul', 'Bishkek', 'Tashkent', 'Ulaanbaatar', 'Moscow', 'Kazan',
    'Baku', 'Ankara', 'Dushanbe', 'Ashgabat',
  ],
};

export const LEVELS = ['International', 'National', 'Regional', 'School', 'Test'];

export const RATING_TYPES = ['blitz', 'rapid', 'classic', 'non_rated'];

export const RATED_RESULTS = ['1-0', '0-1', '0.5-0.5'];
export const NON_RATED_RESULTS = ['+--', '--+', '=-=', '---'];
