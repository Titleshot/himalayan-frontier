Himalayan Frontier - deploy to Vercel
=====================================

This folder is the complete website, ready for Vercel (about 96 MB, under Vercel's 100 MB limit for CLI uploads on the free Hobby plan).

Option 1 - one command (needs Node.js from https://nodejs.org)
  1. Open this folder in File Explorer, click the address bar, type  powershell  and press Enter.
  2. Run:   npx vercel --prod
  3. A browser opens: sign in to Vercel (or create a free account).
  4. Answer the questions with Enter (accept the defaults). When asked "Want to modify these settings?" answer N.
  5. Vercel prints the live address, e.g. https://himalayan-frontier.vercel.app
  To update later: change files here and run  npx vercel --prod  again.

Option 2 - through GitHub (updates go live automatically)
  1. Put this folder in a GitHub repository.
  2. On vercel.com choose Add New > Project > Import that repository > Deploy (no build settings needed).

Before going live: open site-config.js, fill in your phone, WhatsApp, email and licence numbers, and set demo:false.
