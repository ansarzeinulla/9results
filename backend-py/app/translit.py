"""Cyrillic (Russian + Kazakh) to Latin transliteration.

Pure function; must stay in lockstep with the SQL twin `translit_latin()` in
db/migrations/006_aliases_search.sql — both sides index and query the same
spelling so a player registered in either alphabet is findable from the other.
"""

# Multi-character mappings first (applied before single letters).
_MULTI = {
    "щ": "shch", "ш": "sh", "ч": "ch", "ж": "zh", "ю": "yu", "я": "ya",
    "ё": "yo", "э": "e", "х": "kh", "ц": "ts",
}

_SINGLE = {
    # Russian
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "з": "z",
    "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "ы": "y",
    "ъ": "", "ь": "",
    # Kazakh additions
    "ә": "a", "ғ": "g", "қ": "k", "ң": "n", "ө": "o", "ұ": "u", "ү": "u",
    "һ": "h", "і": "i",
}


def translit_latin(text: str) -> str:
    """Lowercase Latin transliteration; Latin input passes through unchanged."""
    s = text.lower()
    for src, dst in _MULTI.items():
        s = s.replace(src, dst)
    return "".join(_SINGLE.get(ch, ch) for ch in s)


def default_aliases(first_name: str, last_name: str, middle_name: str | None = None) -> list[str]:
    """Latin spellings worth auto-adding when a name contains Cyrillic."""
    aliases = []
    for part in (first_name, last_name, middle_name or ""):
        latin = translit_latin(part)
        if part and latin != part.lower():
            aliases.append(latin.capitalize())
    return aliases
