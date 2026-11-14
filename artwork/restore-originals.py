from pathlib import Path

folder = Path(__file__).resolve().parent
with (folder / 'originals.zip').open('wb') as output:
    for part in sorted(folder.glob('originals.zip.part*')):
        with part.open('rb') as source:
            while chunk := source.read(1024 * 1024):
                output.write(chunk)
