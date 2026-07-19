# Portrait assets for Cloudflare R2
#
# This local folder is optional. Uploads in the live bucket currently live at:
#
#   hero-portraits/Sigurd_Warrior.png
#   hero-portraits/Lyra_Rogue.png
#   hero-portraits/Kaeleen_Mage.png
#   hero-portraits/Sariel_Cleric.png
#
# Register new stems in `src/lib/portraits.ts` → `HERO_PORTRAITS_BY_CLASS`.
# Public URLs are built as: `${VITE_R2_PUBLIC_URL}/hero-portraits/{Stem}.png`
#
# Server-side upload helper (optional):
#   npm run portraits:upload -- ./assets/portraits
