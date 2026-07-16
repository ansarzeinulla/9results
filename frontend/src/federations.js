import { useEffect, useState } from 'react';
import { apiGet } from './api.js';

// Federation list is fetched once per session and cached module-wide.
let cache = null;
let pending = null;

function fetchFederations() {
  if (cache) return Promise.resolve(cache);
  pending ??= apiGet('/federations').then((list) => {
    cache = list;
    return list;
  });
  return pending;
}

/** Returns [{code, name, cities}] — empty array until loaded. */
export function useFederations() {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    if (!cache) fetchFederations().then(setList).catch(() => {});
  }, []);
  return list;
}

export function citiesOf(federations, code) {
  return federations.find((f) => f.code === code)?.cities || [];
}
