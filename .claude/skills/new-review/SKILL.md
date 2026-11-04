---
name: new-review
description: Add an app review to aniqa.dev/reviews using the review template, screenshots, scorecard, and concise write-up. Use when the user wants to review an app or runs /new-review.
---

# New app review

Reviews live in `src/content/reviews/<slug>/`. Scaffold one with `npm run new -- --kind review`; this routes to `scripts/new-review.mjs` and starts the entry as a draft.

## 1. Gather details

Confirm the app name, maker, address or store link, device, date tried, and what the user wants to say. Do not invent usage details, scores, or opinions. Leave `[bracketed notes]` for anything Aniqa needs to fill in.

```sh
npm run new -- --yes --kind review --app "App name" --maker handle --live example.com
```

Use `--device phone` or `--device tablet` for a mobile app, and `--device desktop` for a Mac app (its screenshot is only the app with no background, and the site draws the Mac screen around it; set `desktop: window`, `menubar` or `notch` in `index.md`). The maker handle is written without `@`. Edit `src/content/reviews/<slug>/index.md` and follow the template sections: First look, What I liked, Small ideas, Who it's for. Keep the writing plain, specific, and concise.

## 2. Add images

- Web app: run `npm run screenshots -- reviews/<slug>` to capture `screenshot.png` and fetch `logo.png` when one is missing.
- Phone, tablet or Mac app: add the screenshots from the device and the app icon as `logo.png`. Phone reviews can include `screenshot-2.png` and `screenshot-3.png`.
- Write useful `screenshotAlt` text for every screen shown.
- Pictures in the notes: `![alt](./file.png)` under a point, with an optional _italic_ caption line right after. They open full size on click. Crop them to the detail that matters.

## 3. Finish and check

Fill in the scores, verdict, brand colour, date, and review text. Check the draft locally. Run `npm run scorecard -- <slug>` for `scorecard.png`; remove `draft: true` when ready to publish, then run `npm run og` to generate its link preview. Include generated images in the change. Do not commit unless asked.
