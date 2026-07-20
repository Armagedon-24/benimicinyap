---
Task ID: 1
Agent: Main Agent
Task: Komisyon/Gelir Sistemi + Harita Yeniden Tasarımı

Work Log:
- Analized uploaded map image via VLM to understand desired map style
- Added PlatformSetting model to Prisma schema (13 default settings)
- Added platformFee field to Transaction model + platform_commission type
- Updated TypeScript types (Transaction, PlatformSetting interfaces)
- Created /src/lib/commission.ts with commission calculation helpers + caching
- Created /api/admin/settings (GET/PUT) for commission management
- Created /api/admin/revenue for revenue stats dashboard
- Modified /api/tasks/[id] to apply commission on task completion
- Modified /api/admin task-status to apply commission
- Modified /api/wallet to apply withdrawal fees
- Updated seed with 13 platform settings
- Added "Gelir Sistemi" tab to AdminPanel with: revenue stats cards, revenue breakdown, commission settings (rate/mode/payer/listing fee/withdraw fee), recent revenue transactions table
- Rewrote TurkeyMap.tsx: CartoDB light tiles, green numbered city markers, "Coğrafi Güvence & Havuz Haritası" header overlay, zoomed-in sidebar with task list, escrow info panels below map
- Updated DiscoverTasks.tsx: distance slider (10-300km), "Sorgu Önbellekten Getirildi" cache badge, "Mesafe Filtresi Aktif" badge
- Updated Wallet.tsx: platform_commission transaction type, withdraw fee display in success toast
- Verified: commission correctly deducted (750₺ task → 75₺ commission → 675₺ net to tasker)
- Build verified clean with 0 errors

Stage Summary:
- Commission system fully operational with admin-configurable settings
- Map redesigned to match uploaded image with clean CartoDB tiles and green markers
- All 10 tasks completed successfully