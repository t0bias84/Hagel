import os
import sys

def main():
    # Ange själv vilka enheter du vill söka i:
    search_paths = ["C:\\", "D:\\", "E:\\"]  # Anpassa efter dina diskar

    patterns = [
        "WiredTiger",     # WiredTiger.wt, WiredTiger.lock...
        "mongod.lock",
        "journal",
        "collection-",
        "index-"
    ]

    for path in search_paths:
        print(f"\n=== Söker i enhet: {path} ===")
        for root, dirs, files in os.walk(path, onerror=lambda e: None):
            for f in files:
                for pat in patterns:
                    if pat.lower() in f.lower():
                        fullpath = os.path.join(root, f)
                        print(f"    Hittat fil: {fullpath}")

if __name__ == "__main__":
    main()
