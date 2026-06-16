# Legge til nye artikler

## Oversikt over systemet

Når en kunde kjøper artikler skjer følgende:
1. Checkout → MobilePay-betaling
2. Cloudflare Worker capturer betalingen og sender ordre-JSON til Google Apps Script webhook
3. Apps Script logger til Google Sheet og sender e-post med PDF-vedlegg hentet fra Google Drive

---

## Mappestruktur i Google Drive

| Mappe | Drive-ID |
|---|---|
| Toiset Aijat - Articles (rot) | `1Inzc8xuDMWK_gr5Z_2gZiXxRUSivzVTQ` |
| Uudenmaan Ratsurykmentti | `1VyZDZItrhTPacnfxQKzX8pdlw5N-8G7V` |
| Karjalan ratsurykmentti | `1Z6Fon29xzG69J_aiZcziWQrEFCm2E_kv` |
| Viipurin läänintilit | `1CBmubIYpRWVXQl_OkApm2VKevovet_C2` |

Samlefiler (alle artikler i én PDF) ligger direkte i rotnivå-mappen.

---

## Steg for å legge til ny artikkel

### 1. Konverter .doc/.docx til PDF via Word (macOS)

Kopier filen til `/tmp/` først (Word kan ikke nå iCloud Drive direkte):

```bash
cp "/Users/jarle/Library/Mobile Documents/.../articles/Mappe/NY ARTIKKEL.doc" /tmp/

osascript << 'EOF'
tell application "Microsoft Word"
  try
    open POSIX file "/tmp/NY ARTIKKEL.doc"
    set theDoc to active document
    save as theDoc file name "/tmp/NY ARTIKKEL.pdf" file format format PDF
    close theDoc saving no
    log "OK"
  on error errMsg
    log "ERR: " & errMsg
  end try
end tell
EOF
```

Verifiser at filen ikke er tom:
```bash
ls -lh "/tmp/NY ARTIKKEL.pdf"
```

### 2. Last opp PDF til riktig Drive-mappe

```bash
export CLOUDSDK_PYTHON=$(brew --prefix python@3.12)/bin/python3.12
TOKEN=$(gcloud auth print-access-token)
FOLDER="<DRIVE-MAPPE-ID>"  # Se tabell over

RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "metadata={\"name\":\"NY ARTIKKEL\",\"parents\":[\"$FOLDER\"]};type=application/json;charset=UTF-8" \
  -F "file=@\"/tmp/NY ARTIKKEL.pdf\";type=application/pdf" \
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")

FILE_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','ERROR'))")
echo "File ID: $FILE_ID"
```

### 3. Beregn cart-ID

Cart-ID-formatet er: `{collection-id}-{sanitized-article-name}`

Sanitizing-logikk (samme som `myynissa.astro`):
- Mellomrom → `-`
- Fjern alle tegn som ikke er `a-z`, `0-9` eller `-`
- Gjør om til lowercase

Eksempler:
| Kollektion-ID | Artikkel | Cart-ID |
|---|---|---|
| `uudenmaan-ratsurykmentti` | `1850` | `uudenmaan-ratsurykmentti-1850` |
| `karjalan-ratsurykmentti-artikkelit` | `1713–1721` | `karjalan-ratsurykmentti-artikkelit-17131721` |
| `viipurin-laanintilit` | `1707 ym` | `viipurin-laanintilit-1707-ym` |

For å beregne nøyaktig cart-ID, kjør:
```bash
python3 -c "
import re
def sanitize(a):
    return re.sub(r'[^a-zA-Z0-9-]', '', re.sub(r'\s+', '-', str(a))).lower()
col = 'uudenmaan-ratsurykmentti'  # endre dette
art = '1850'                       # endre dette
print(f'{col}-{sanitize(art)}')
"
```

### 4. Oppdater Apps Script

Legg til ny linje i `PDF_ARTICLES`-objektet i Apps Script:
```javascript
'<cart-id>': '<drive-file-id>',
```

Redeploy Apps Script: **Deploy → Manage deployments → velg eksisterende → Edit → redeploy**.

### 5. Oppdater YAML-samlingsfil

Legg til artikkelnavnet i `articles`-listen i riktig fil under `src/content/article-collections/`. Oppdater også `articleCount`.

### 6. Oppdater MDX-artikkelside

Legg til ny `<div>`-rad i artikkelgriden i riktig fil under `src/content/articles/`.

### 7. Oppdater samlefilen (hvis aktuelt)

Hvis du har en oppdatert samlefil, last opp og oppdater Drive-ID-en ved å bruke PATCH:
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -F "metadata={};type=application/json" \
  -F "file=@\"/tmp/NY_SAMLE.pdf\";type=application/pdf" \
  "https://www.googleapis.com/upload/drive/v3/files/<EKSISTERENDE-FIL-ID>?uploadType=multipart"
```

---

## Batch-konvertering av mange filer

For å konvertere en hel mappe med .doc/.docx på én gang via Word:

```bash
# 1. Kopier alle filer til /tmp/word_in/
SRC="/Users/jarle/Library/Mobile Documents/.../articles/Mappe"
mkdir -p /tmp/word_in /tmp/out_pdfs
for f in "$SRC"/*.doc "$SRC"/*.docx; do
  [ -f "$f" ] || continue
  cp "$f" /tmp/word_in/
done

# 2. Generer og kjør AppleScript
python3 - << 'EOF'
import os
files = sorted([f for f in os.listdir('/tmp/word_in') if not f.startswith('~$')])
lines = ['tell application "Microsoft Word"']
for f in files:
    base = f.rsplit('.', 1)[0]
    lines += [
        '\ttry',
        f'\t\topen POSIX file "/tmp/word_in/{f}"',
        '\t\tset theDoc to active document',
        f'\t\tsave as theDoc file name "/tmp/out_pdfs/{base}.pdf" file format format PDF',
        '\t\tclose theDoc saving no',
        f'\t\tlog "OK: {f}"',
        '\ton error errMsg',
        f'\t\tlog "ERR: {f} - " & errMsg',
        '\tend try',
    ]
lines.append('end tell')
with open('/tmp/batch_convert.applescript', 'w') as out:
    out.write('\n'.join(lines))
print(f"Script klar: {len(files)} filer")
EOF

osascript /tmp/batch_convert.applescript 2>&1

# 3. Verifiser at ingen er tomme
ls -lh /tmp/out_pdfs/*.pdf | awk '$5 == "0" {print "TOM:", $9}'
```

## Slå sammen PDF-deler til én fil

```bash
python3 - << 'EOF'
from pypdf import PdfWriter
w = PdfWriter()
for f in ["del1.pdf", "del2.pdf", "del3.pdf"]:
    w.append(f"/tmp/{f}")
w.write("/tmp/samlet.pdf")
print("Ferdig")
EOF
```

---

## Kolleksjons-IDer (YAML-filnavn = Astro content ID)

| Samling | Kollektion-ID | YAML-fil |
|---|---|---|
| Uudenmaan Ratsurykmentti | `uudenmaan-ratsurykmentti` | `uudenmaan-ratsurykmentti.yaml` |
| Karjalan ratsurykmentti | `karjalan-ratsurykmentti-artikkelit` | `karjalan-ratsurykmentti-artikkelit.yaml` |
| Viipurin läänintilit | `viipurin-laanintilit` | `viipurin-laanintilit.yaml` |

Når en kunde bestiller hele samlingen brukes kollektion-ID-en direkte (uten artikkelsuffiks) som cart-ID. Apps Script ser da etter samlefilen i `PDF_ARTICLES`.
