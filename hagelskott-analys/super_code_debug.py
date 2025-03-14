#!/usr/bin/env python3
# file: super_code_debug.py
"""
Ett "super-sök"-script som går igenom alla .py-filer i projektet
och letar efter mönster som kan skapa problem. Det skriver sedan
alla fynd både till stdout och en output-fil (default: super_code_debug_output.txt).

Kör:   python super_code_debug.py /sökväg/till/projektet
Ange valfritt --output=PATH för att styra vart txt-loggen ska sparas.
"""

import sys
import os
import re
import argparse
from datetime import datetime

# Här definierar du vilka mönster du vill leta efter.
# "Nyckeln" är en etikett, "Värdet" är en regex.
# OBS! Regex är "case sensitive" – vill du ignorera gemener/versaler,
# lägg till re.IGNORECASE när du kompilerar dem.
SEARCH_PATTERNS = {
    # Möjliga problem kring MongoDB
    "MongoDB 'db.db' usage": re.compile(r"\bdb\.db\b"),
    "Motor usage with bracket access (db['collection'])": re.compile(r"db\[\s*['\"].+['\"]\s*\]"),
    "Old pydantic config 'allow_population_by_field_name'": re.compile(r"allow_population_by_field_name"),
    "Legacy pydantic config v1->v2 'Config:' special keys": re.compile(r"^class\s+Config\s*\(.*\)\s*:", re.MULTILINE),
    
    # Allmänt:
    "Hard-coded secrets (e.g. SECRET_KEY = '...')": re.compile(r"(SECRET_KEY\s*=\s*['\"]).+?(?=['\"])"),
    "Manual print statements": re.compile(r"\bprint\s*\("),
    "Potential debug 'import pdb'": re.compile(r"import\s+pdb"),
    "Potentially suspicious eval() usage": re.compile(r"\beval\s*\("),
    
    # T.ex. se om man råkat skriva "current_user = Depends(get_current_user)"
    # men sen använder fel funktion
    "Incorrect depends usage": re.compile(r"Depends\s*\(\s*get_current_active_user\s*\)")
}

def scan_file(filepath: str, debug: bool) -> list:
    """
    Öppnar en .py-fil rad-för-rad och kontrollerar mot
    våra mönster i SEARCH_PATTERNS. Returnerar en lista
    med dict: {pattern, line_no, line_text}.
    
    :param filepath: Filvägen (till en .py)
    :param debug: Om vi ska logga debug-utskrifter.
    """
    matches_found = []
    if debug:
        print(f"DEBUG: Scanning file {filepath}")

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
        matches_found.append({
            "pattern": "File read error",
            "line_no": -1,
            "line_text": f"Could not read file: {e}"
        })
    return matches_found

def walk_directory(root_dir: str, debug: bool) -> list:
    """
    Går rekursivt igenom root_dir och dess underkataloger,
    letar upp .py-filer och kör scan_file(...) på dem.
    
    :param root_dir: Rotmappen för projektet
    :param debug: debug-läge
    :return: en lista med (filväg, matchningar)
    """
    findings = []
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".py"):
                fullpath = os.path.join(dirpath, filename)
                result = scan_file(fullpath, debug)
                if result:
                    findings.append((fullpath, result))
    return findings

def main():
    parser = argparse.ArgumentParser(description="Super-sök script för pythonkod.")
    parser.add_argument("directory", help="Sökväg till projektets rot")
    parser.add_argument("--debug", action="store_true", help="Visa debug-utskrifter")
    parser.add_argument("--output", default="super_code_debug_output.txt",
                        help="Filnamn för text-rapport (default: super_code_debug_output.txt)")
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"Fel: {args.directory} är ingen katalog eller existerar inte.")
        sys.exit(1)

    if args.debug:
        print(f"DEBUG: Starting super-sök i katalog: {args.directory}")
        print(f"DEBUG: Output kommer sparas i: {args.output}")

    findings = walk_directory(args.directory, args.debug)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    with open(args.output, "w", encoding="utf-8") as out_f:
        # Skriv en header
        out_f.write(f"*** Super-sök rapport {timestamp} ***\n")
        out_f.write(f"Projektkatalog: {args.directory}\n\n")

        if not findings:
            msg = "✅  Inga misstänkta träffar enligt våra mönster!"
            print(msg)
            out_f.write(msg + "\n")
        else:
            msg = f"=== POTENTIELLA PROBLEM UPPTÄCKTA i {len(findings)} filer ===\n"
            print(msg)
            out_f.write(msg + "\n")
            for (fpath, matches) in findings:
                out_f.write(f"FIL: {fpath}\n")
                print(f"FIL: {fpath}")
                for match in matches:
                    line_info = f"  → [{match['pattern']}] rad {match['line_no']}: {match['line_text']}"
                    out_f.write(line_info + "\n")
                    print(line_info)
                out_f.write("\n")
                print()

    print(f"\nFärdig. Se {args.output} för full rapport.")

if __name__ == "__main__":
    main()
