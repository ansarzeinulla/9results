// Shared domain constants. Federations/cities live in ../federations/*.json.
export { FEDERATIONS, CITIES_BY_FEDERATION, FEDERATION_LIST } from '../federations/index.js';

export const LEVELS = ['International', 'National', 'Regional', 'School', 'Test'];

export const RATING_TYPES = ['blitz', 'rapid', 'classic', 'non_rated'];

// Tournament audience attributes (informational, like level).
export const GENDERS = ['all', 'male', 'female'];
export const AGE_CATEGORIES = ['all', 'U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20'];

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
