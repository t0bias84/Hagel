import os

# Ange vilka sökord vi vill leta efter
SEARCH_TERMS = [
    "db.db(",   # exempel, letar efter anrop typ db.db(something
    "db.db.",   # letar efter attribut typ db.db.users
    "db.db"     # fallback ifall man skrivit i nåt annat sammanhang
]

# Ange vilka filändelser som är intressanta
VALID_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx"}

def search_in_file(file_path, search_terms):
    matches = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, start=1):
                for term in search_terms:
                    if term in line:
                        matches.append((lineno, line.strip()))
    except UnicodeDecodeError:
        # En del filer kan innehålla binärt innehåll, ignorera
        pass
    return matches

def main():
    # Byt ut till den katalog du vill söka i, t.ex. "C:/Users/tjans/Documents/Hagel/hagelskott-analys"
    project_dir = r"C:/Users/tjans/Documents/Hagel/hagelskott-analys"

    for root, dirs, files in os.walk(project_dir):
        for filename in files:
            # Kolla filändelser
            _, ext = os.path.splitext(filename)
            if ext.lower() in VALID_EXTENSIONS:
                file_path = os.path.join(root, filename)
                results = search_in_file(file_path, SEARCH_TERMS)
                if results:
                    print(f"\nI filen: {file_path}")
                    for (lineno, text) in results:
                        print(f"  Rad {lineno}: {text}")

if __name__ == "__main__":
    main()
