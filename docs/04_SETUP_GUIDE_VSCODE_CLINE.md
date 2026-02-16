# Konfiguracja VSCode + Cline dla TimeTracker

## 📦 Wymagania wstępne

```bash
# 1. Zainstaluj Node.js (v18+)
node --version  # Sprawdź czy masz

# 2. Zainstaluj pnpm (szybszy niż npm)
npm install -g pnpm

# 3. Zainstaluj Expo CLI
npm install -g expo-cli

# 4. Zainstaluj Supabase CLI
npm install -g supabase

# 5. Zainstaluj VSCode
# https://code.visualstudio.com/
```

## 🔌 Rozszerzenia VSCode

Zainstaluj następujące rozszerzenia:

```json
{
  "recommendations": [
    "saoudrizwan.claude-dev",           // Cline (Claude Dev)
    "dbaeumer.vscode-eslint",           // ESLint
    "esbenp.prettier-vscode",           // Prettier
    "bradlc.vscode-tailwindcss",        // Tailwind IntelliSense
    "supabase.supabase-vscode",         // Supabase
    "firsttris.vscode-jest-runner",     // Jest Test Runner
    "pflannery.vscode-versionlens",     // Version Lens
    "streetsidesoftware.code-spell-checker", // Spell Checker
    "usernamehw.errorlens",             // Error Lens
    "visualstudioexptteam.vscodeintellicode", // IntelliCode
    "ms-vscode.vscode-typescript-next"  // TypeScript
  ]
}
```

Skopiuj powyższe do `.vscode/extensions.json` w swoim projekcie.

## ⚙️ Konfiguracja Cline

### Krok 1: Zainstaluj Cline

1. Otwórz VSCode
2. Przejdź do Extensions (Ctrl+Shift+X)
3. Szukaj "Cline" lub "Claude Dev"
4. Kliknij Install

### Krok 2: Skonfiguruj API Key

1. Otwórz Cline (kliknij ikonę w lewym panelu)
2. Kliknij na ikonę ustawień (⚙️)
3. Wybierz "API Provider": **Anthropic**
4. Wklej swój API key z https://console.anthropic.com/

### Krok 3: Dodaj Skille

Skopiuj skille do projektu:

```bash
# W głównym folderze projektu
mkdir -p cline-skills

# Skopiuj skille
cp /path/to/timetracker-skills/* cline-skills/
```

### Krok 4: Konfiguracja MCP Servers

Utwórz plik `cline_mcp_settings.json` w głównym folderze projektu:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:your-password@db.your-ref.supabase.co:5432/postgres"
      ]
    }
  },
  "customInstructions": "You are working on TimeTracker - a mobile time tracking app for construction workers. Always use TypeScript, follow the service layer pattern, and prioritize offline-first architecture.",
  "skills": [
    {
      "name": "timetracker-rn-dev",
      "path": "./cline-skills/timetracker/SKILL.md",
      "enabled": true
    },
    {
      "name": "timetracker-supabase",
      "path": "./cline-skills/timetracker-supabase/SKILL.md",
      "enabled": true
    }
  ]
}
```

### Krok 5: Zmienne środowiskowe

Utwórz `.env.local`:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
PROJECT_REF=your-project-ref
DB_PASSWORD=your-db-password

# Anthropic (dla Cline)
ANTHROPIC_API_KEY=sk-ant-api...
```

## 🚀 Inicjalizacja Projektu

### 1. Utwórz projekt Expo

```bash
# Utwórz nowy projekt
npx create-expo-app timetracker-mobile --template blank-typescript

cd timetracker-mobile

# Zainstaluj zależności
pnpm install @supabase/supabase-js @tanstack/react-query zustand
pnpm install react-native-paper date-fns
pnpm install exceljs jspdf jspdf-autotable

# Expo modules
npx expo install expo-camera expo-file-system expo-document-picker
npx expo install expo-sharing expo-print

# Dev dependencies
pnpm install -D @types/node
```

### 2. Inicjalizuj Supabase

```bash
# Zaloguj się
supabase login

# Inicjalizuj projekt
supabase init

# Linkuj z projektem w chmurze
supabase link --project-ref YOUR_PROJECT_REF

# Utwórz początkową migrację
supabase migration new initial_schema

# Zastosuj migracje (skopiuj SQL z dokumentacji technicznej)
supabase db push
```

### 3. Struktura folderów

```bash
# Utwórz strukturę projektu
mkdir -p app/\(tabs\)
mkdir -p components/{ui,employee,time,shared}
mkdir -p services
mkdir -p stores
mkdir -p hooks
mkdir -p utils
mkdir -p types
mkdir -p supabase/{functions,migrations}
mkdir -p cline-skills
```

### 4. Konfiguracja TypeScript

`tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/services/*": ["./services/*"],
      "@/stores/*": ["./stores/*"],
      "@/utils/*": ["./utils/*"],
      "@/types/*": ["./types/*"]
    }
  }
}
```

### 5. Generuj typy z Supabase

```bash
supabase gen types typescript --local > types/database.types.ts
```

## 🤖 Praca z Cline

### Uruchomienie Cline

1. Otwórz projekt w VSCode
2. Kliknij ikonę Cline w lewym panelu
3. Cline automatycznie załaduje skille z `cline-skills/`

### Przykładowe komendy dla Cline

```
"Utwórz nowy screen dla listy pracowników z możliwością dodawania i edycji"

"Zaimplementuj service layer dla time_entries z CRUD operations"

"Dodaj migrację Supabase dla tabeli documents z kolumnami: file_name, file_path, ocr_text"

"Stwórz React Query hook dla pobierania miesięcznych godzin pracownika"

"Dodaj komponent Calendar do wyboru daty z highlightowaniem dni z wpisami"

"Zaimplementuj offline sync queue - zapisuj operacje lokalnie i synchronizuj gdy jest internet"

"Utwórz funkcję exportu do Excel z miesięcznym zestawieniem godzin"

"Dodaj OCR processing dla zdjęć dokumentów dostawy"
```

### Skille będą automatycznie:

- ✅ Używać właściwych wzorców projektowych (service layer, React Query, Zustand)
- ✅ Generować kod TypeScript z prawidłowymi typami
- ✅ Stosować konwencje nazewnictwa z projektu
- ✅ Dodawać error handling
- ✅ Tworzyć testy jednostkowe
- ✅ Dokumentować kod
- ✅ Stosować best practices React Native

### MCP Servers dają Cline dostęp do:

- **Supabase MCP**: Bezpośrednie operacje na bazie danych
- **Filesystem MCP**: Odczyt i zapis plików w projekcie
- **Postgres MCP**: Zaawansowane zapytania SQL

## 📝 Workflow z Cline

### Typowy przepływ pracy:

1. **Opisz co chcesz zrobić**
   ```
   "Potrzebuję ekran do dodawania godzin pracy dla całej ekipy na raz"
   ```

2. **Cline zapyta o szczegóły**
   - Używając skillów, Cline zadaje inteligentne pytania
   - Wykorzystuje wiedzę o projekcie z `customInstructions`

3. **Cline generuje kod**
   - Tworzy komponenty według wzorców z skillów
   - Używa właściwych typów z `database.types.ts`
   - Dodaje error handling i loading states

4. **Review i iteracja**
   ```
   "Dodaj walidację - godziny muszą być między 0 a 24"
   "Zmień layout - użyj grid zamiast listy"
   ```

5. **Testowanie**
   ```
   "Uruchom testy dla tego komponentu"
   "Sprawdź czy TypeScript przechodzi"
   ```

## 🔥 Przydatne Komendy VSCode

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Expo",
      "type": "shell",
      "command": "npx expo start",
      "problemMatcher": []
    },
    {
      "label": "Generate Supabase Types",
      "type": "shell",
      "command": "supabase gen types typescript --local > types/database.types.ts",
      "problemMatcher": []
    },
    {
      "label": "TypeScript Check",
      "type": "shell",
      "command": "npx tsc --noEmit",
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "npm test",
      "problemMatcher": []
    }
  ]
}
```

## 🎯 Kluczowe Skróty

- `Ctrl + Shift + P` → Command Palette
- `Ctrl + ,` → Settings
- `Ctrl + Shift + E` → Explorer
- `Ctrl + Shift + F` → Search
- `Ctrl + Shift + D` → Debug
- `Ctrl + \`` → Terminal

## 🐛 Troubleshooting

### Cline nie widzi skillów
```bash
# Sprawdź ścieżki w cline_mcp_settings.json
# Upewnij się że skille są w odpowiednim folderze
ls cline-skills/
```

### MCP Server nie działa
```bash
# Sprawdź czy npx działa
npx --version

# Sprawdź logi Cline (Output panel → Cline)
```

### Expo nie startuje
```bash
# Wyczyść cache
npx expo start -c

# Sprawdź node_modules
rm -rf node_modules
pnpm install
```

### TypeScript errors po zmianach w bazie
```bash
# Regeneruj typy
supabase gen types typescript --local > types/database.types.ts

# Restart TS server w VSCode
Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

## 📚 Dodatkowe Zasoby

- **Cline Docs**: https://github.com/cline/cline
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Expo Docs**: https://docs.expo.dev/
- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query/latest

## 💡 Pro Tips

1. **Kontekst projektu**: Cline automatycznie czyta pliki projektu, ale możesz pomóc dodając kluczowe info do `customInstructions`

2. **Skille**: Im więcej szczegółów w skillach, tym lepsze odpowiedzi. Dodawaj przykłady z Twojego projektu.

3. **MCP Servers**: Używaj ich do zaawansowanych operacji - Cline może bezpośrednio wykonywać SQL queries przez Postgres MCP.

4. **Iteracja**: Nie oczekuj perfekcji za pierwszym razem. Cline świetnie radzi sobie z iteracjami i poprawkami.

5. **Memory Bank**: Cline pamięta kontekst między sesjami. Możesz odniesić się do poprzednich rozmów.

6. **Git Integration**: Cline może automatycznie commitować zmiany. Sprawdzaj co commituje!

7. **Testing**: Proś Cline o testy dla krytycznych funkcji. Skill automatycznie użyje właściwych wzorców.

---

## 🎬 Szybki Start

```bash
# 1. Sklonuj template lub utwórz nowy projekt
npx create-expo-app timetracker-mobile --template blank-typescript
cd timetracker-mobile

# 2. Zainstaluj zależności (patrz sekcja "Inicjalizacja Projektu")
pnpm install ...

# 3. Skopiuj skille
mkdir cline-skills
# Skopiuj SKILL.md files

# 4. Utwórz cline_mcp_settings.json
# (patrz przykład powyżej)

# 5. Ustaw zmienne środowiskowe (.env.local)
# (patrz przykład powyżej)

# 6. Inicjalizuj Supabase
supabase init
supabase link
# Zastosuj migracje z DOKUMENTACJA_TECHNICZNA.md

# 7. Generuj typy
supabase gen types typescript --local > types/database.types.ts

# 8. Otwórz w VSCode i uruchom Cline!
code .
```

Teraz możesz rozpocząć rozmowę z Cline:

```
"Cześć! Zacznijmy od utworzenia podstawowej struktury projektu TimeTracker. 
Potrzebuję:
1. Konfiguracja Supabase client
2. Service layer dla employees
3. React Query hook dla employees
4. Dashboard screen z listą pracowników"
```

Cline użyje skillów i MCP servers żeby zbudować to wszystko zgodnie z best practices! 🚀
