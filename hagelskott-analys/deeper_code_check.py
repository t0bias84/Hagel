#!/usr/bin/env python3
# file: deeper_code_check.py
"""
Ett script som söker igenom alla .py-filer under en projektmapp
och letar efter olika möjliga fel, t.ex. "db.db", föråldrade pydantic-konfigurationer,
eller annat du vill hitta.

Kör:   python deeper_code_check.py /sökväg/till/projektet
"""

import sys
import os
import re

# Här kan du lägga till fler sök-uttryck
# Nyckel = beskrivande namn, Värde = regex som ska matchas
SEARCH_PATTERNS = {
    "MongoDB 'db.db' usage": re.compile(r"\bdb\.db\b"),  # Letar efter "db.db"
    "Old pydantic config 'allow_population_by_field_name'": re.compile(r"allow_population_by_field_name"),
    "Hard-coded secrets (ex SECRET_KEY=...)": re.compile(r"(SECRET_KEY\s*=\s*['\"]).+?(?=['\"])"),
    # Nedan är bara exempel - anpassa efter behov:
    "Manual print statements": re.compile(r"\bprint\s*\("),
    "Py2 style super(...) calls": re.compile(r"\bsuper\([^)]*\)\b"),
    # ...osv.
}

def scan_file(filepath: str):
    """
    Öppnar en fil rad-för-rad och kontrollerar mot
    våra mönster i SEARCH_PATTERNS. Returnerar en lista
    med dict om var vi hittade matchningar.
    """
    matches_found = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, start=1):
                for pattern_name, pattern_regex in SEARCH_PATTERNS.items():
                    if pattern_regex.search(line):
                        matches_found.append({
                            "pattern": pattern_name,
                            "line_no": i,
                            "line_text": line.strip()
                        })
    except (UnicodeDecodeError, PermissionError) as e:
        # Vissa filer kan orsaka problem (binär, etc.)
        # Ignorera men flagga kanske filen som "otillgänglig"
        matches_found.append({
            "pattern": "File read error",
            "line_no": -1,
            "line_text": f"Could not read file: {e}"
        })
    return matches_found

def main(root_dir: str):
    """
    Går rekursivt genom root_dir och dess underkataloger,
    letar upp .py-filer och kör scan_file(...) på dem.
    """
    findings = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".py"):
                fullpath = os.path.join(dirpath, filename)
                result = scan_file(fullpath)
                if result:
                    findings.append((fullpath, result))
    
    if not findings:
        print("✅  Inga misstänkta träffar i koden enligt angivna mönster!")
    else:
        print("\n=== POTENTIELLA PROBLEM UPPTÄCKTA ===\n")
        for fpath, matches in findings:
            print(f"FIL: {fpath}")
            for m in matches:
                print(f"  → [{m['pattern']}] rad {m['line_no']}: {m['line_text']}")
            print()
    print("Färdig.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Användning: python deeper_code_check.py <C:\Users\tjans\Documents\Hagel\hagelskott-analys>")
        sys.exit(1)
    
    target_directory = sys.argv[1]
    if not os.path.isdir(target_directory):
        print(f"Sökvägen '{target_directory}' är ingen katalog eller finns inte.")
        sys.exit(1)
    
    main(target_directory)
