// Domain constants. Federations and their cities come from the backend
// (GET /api/federations, sourced from backend/src/federations/*.json) —
// see useFederations() in federations.js.

export const LEVELS = ['International', 'National', 'Regional', 'School', 'Test'];

export const RATING_TYPES = ['blitz', 'rapid', 'classic', 'non_rated'];

export const GENDERS = ['all', 'male', 'female'];
export const AGE_CATEGORIES = ['all', 'U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20'];

export const RATED_RESULTS = ['1-0', '0-1', '0.5-0.5'];
export const NON_RATED_RESULTS = ['+--', '--+', '=-=', '---'];
