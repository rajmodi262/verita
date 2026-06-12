#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
#  COMPILE-MASTERPACK — builds every PDF in dependency order.
#  Requires: xelatex (MiKTeX / TeX Live) on PATH.
#  Usage:    ./compile-masterpack.sh          (build everything)
#            ./compile-masterpack.sh gallery  (gallery only)
# ══════════════════════════════════════════════════════════════════
set -u

# ── colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; GOLD='\033[0;33m'; DIM='\033[2m'; NC='\033[0m'

echo -e "${CYAN}"
cat << 'BANNER'
  ╔╦╗╦ ╦╔═╗  ╔╦╗╔═╗╔═╗╔╦╗╔═╦═╗╔═╗╔═╗╦╔═
   ║ ╠═╣║╣   ║║║╠═╣╚═╗ ║ ║╣ ╠╦╝╠═╝╠═╣║ ╩╗
   ╩ ╩ ╩╚═╝  ╩ ╩╩ ╩╚═╝ ╩ ╚═╝╩╚═╩  ╩ ╩╩╚═╝
BANNER
echo -e "${NC}   Building the VERITA Interview Pack..."
echo -e "${DIM}   every page shows its work${NC}\n"

# ── engine check ──
if ! command -v xelatex >/dev/null 2>&1; then
  echo -e "${RED}✗ xelatex not found.${NC}"
  echo -e "  Install MiKTeX (Windows: winget install MiKTeX.MiKTeX)"
  echo -e "  or TeX Live, then re-run. Nothing was built."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0
declare -a SUMMARY

# compile <dir> <file.tex>
compile() {
  local dir="$1" file="$2" name="${2%.tex}"
  printf "${YELLOW}  ⟳ %-34s${NC}" "$name"
  if ( cd "$ROOT/$dir" && xelatex -interaction=nonstopmode -halt-on-error \
        "$file" >/dev/null 2>&1 && xelatex -interaction=nonstopmode \
        -halt-on-error "$file" >/dev/null 2>&1 ); then
    local pages
    pages=$(grep -aoP '(?<=Page )\d+' "$ROOT/$dir/${name}.log" 2>/dev/null | tail -1)
    [ -z "${pages:-}" ] && pages="?"
    printf "\r${GREEN}  ✓ %-34s${NC} ${DIM}%s pp${NC}\n" "$name" "$pages"
    SUMMARY+=("$(printf '%-38s %6s pages   OK' "$dir/$name.pdf" "$pages")")
    PASS=$((PASS+1))
  else
    printf "\r${RED}  ✗ %-34s${NC} ${DIM}see %s/%s.log${NC}\n" "$name" "$dir" "$name"
    SUMMARY+=("$(printf '%-38s %13s   FAILED' "$dir/$name.pdf" '-')")
    FAIL=$((FAIL+1))
  fi
}

TARGET="${1:-all}"

# ── stage 1: the gallery (everything else embeds these) ──
if [ "$TARGET" = "all" ] || [ "$TARGET" = "gallery" ]; then
  echo -e "${GOLD}━━ STAGE 1 · THE GALLERY (16 pieces) ━━━━━━━━━━━━━━━━${NC}"
  for f in g1-universe-map g2-origin-story-comic g3-solar-system g4-factory-floor \
           g5-battle-radar g6-anatomy-mcp g7-before-after-world g8-decision-comics \
           g9-roadtrip-map g10-receipt-of-genius g11-newspaper-front-page \
           g12-movie-poster g13-periodic-table g14-blueprint-diagram \
           g15-iceberg-model g16-constellation-map; do
    compile "04-the-gallery" "$f.tex"
  done
fi

# ── stage 2: the bundles (depend on stage 1) ──
if [ "$TARGET" = "all" ] || [ "$TARGET" = "bundles" ]; then
  echo -e "\n${GOLD}━━ STAGE 2 · THE BUNDLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  compile "05-the-bundles/hr-masterpack" "hr-masterpack.tex"
  compile "05-the-bundles/hr-masterpack" "cover-letter-insert.tex"
  compile "05-the-bundles/tech-masterpack" "tech-masterpack.tex"
  compile "05-the-bundles/tech-masterpack" "technical-appendix.tex"
  compile "05-the-bundles/universal-one-pager" "one-pager.tex"
fi

# ── stage 3: the artifacts (poster + wrappers depend on stage 1) ──
if [ "$TARGET" = "all" ] || [ "$TARGET" = "artifacts" ]; then
  echo -e "\n${GOLD}━━ STAGE 3 · THE ARTIFACTS ━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for f in desk-poster business-card project-receipt fake-newspaper \
           constitution offer-letter; do
    compile "06-the-artifacts" "$f.tex"
  done
fi

# ── summary table ──
echo -e "\n${CYAN}══ BUILD SUMMARY ═══════════════════════════════════════════${NC}"
printf "  %-38s %12s   %s\n" "FILE" "PAGES" "STATUS"
printf "  %s\n" "------------------------------------------------------------"
for line in "${SUMMARY[@]}"; do echo "  $line"; done
printf "  %s\n" "------------------------------------------------------------"
echo -e "  ${GREEN}passed: $PASS${NC}   ${RED}failed: $FAIL${NC}"

# ── print instructions ──
if [ "$FAIL" -eq 0 ] && [ "$PASS" -gt 0 ]; then
  echo -e "\n${GOLD}══ PRINT RUN ═══════════════════════════════════════════════${NC}"
  echo "  hr-masterpack.pdf ......... A4 · color · 120gsm · spiral or clip · ×2"
  echo "  tech-masterpack.pdf ....... A4 · color · 120gsm · spiral or clip · ×2"
  echo "  one-pager.pdf ............. A4 · color · 160gsm · loose · ×4"
  echo "  fake-newspaper.pdf ........ A4 · SINGLE-sided · 90gsm cream · ×2"
  echo "  business-card.pdf ......... duplex · 300gsm+ · cut to crop marks · ×5"
  echo "  desk-poster.pdf ........... A3 · color · 160gsm · rolled, not folded"
  echo "  constitution.pdf .......... A4 · 120gsm cream if available"
  echo "  offer-letter.pdf .......... A4 · plain · keep hidden until earned"
  echo "  (full details: PRINT-INSTRUCTIONS.md)"
  echo ""
  echo -e "  ${GREEN}🏆 BUILD COMPLETE. Go get that internship. You've earned it.${NC}"
else
  echo -e "\n${YELLOW}  Fix the failures above, then re-run. The logs know everything.${NC}"
fi
