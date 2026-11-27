---
title: 'Little Doors: Christmas'
# the browser tab and search result title: the phrases people search for, not just the name
pageTitle: 'Little Doors: Christmas, a digital advent calendar app for Mac'
type: Mac app
stack: Swift / SwiftUI / AppKit / Sparkle / Astro
released: 2026-11
live: littledoors.app
order: 1
blurb: A festive advent calendar that lives in your Mac’s menu bar.
# ---------- shown at the top of the page, with a "Get it" button ----------
price: '$2.99'
# TODO(Aniqa): change when the 100 launch keys are gone (then $5.99; Golden Key $5.99 now, $10.99 after)
priceNote: 'Launch price, first 100 keys'
requires: 'macOS 13 or later'
getUrl: https://littledoors.app/christmas
# more links after Live ↗, e.g. the launch posts. Uncomment and fill in:
# extraLinks:
#   - { label: 'Show HN', href: 'https://news.ycombinator.com/item?id=…' }
#   - { label: 'X', href: 'https://x.com/aniqatc/status/…' }
# places that wrote about it or listed it. Uncomment and fill in:
# featuredOn:
#   - { label: 'Site name', href: 'https://…' }
# the link preview and the home page hover use screenshot.png; the page itself shows the launch block below
screenshotAlt: "Little Doors: Christmas share image in dark mode: string lights along the top, the headline “An advent calendar that lives in your menu bar.”, and a grid of 25 numbered doors with door 1 and door 25 open."
# ---------- the launch: the calendar on a Mac screen, a gallery, and Get it / sign-up at the end ----------
launch:
  desktop: menubar
  # TODO(Aniqa): swap for a real 2× capture of the popover with no background (Shift-Cmd-4, Space, click it)
  screen: ./screen.jpg
  screenAlt: 'The Little Doors calendar open from the menu bar: “Merry Christmas, open door 1 to begin” above 25 doors in red, green and gold, door 1 with a wreath and door 25 with a gold star'
  logo: ./logo.png
  brand: '#c0392b'
  gallery:
    - { src: ./gallery-tree.jpg, alt: 'A Christmas tree on the desktop, covered in ornaments', caption: 'A new ornament with every door' }
    - { src: ./gallery-snowman.jpg, alt: 'A snowman on the desktop in a red Santa hat and a striped scarf', caption: 'A snowman to dress up in hats and scarves' }
    - { src: ./gallery-stockings.jpg, alt: 'Four knitted stockings hanging in a row, two named Jim and Pam', caption: 'Stockings with the names you choose' }
    - { src: ./gallery-sleighs.jpg, alt: 'Three sleighs riding along the top of the Dock', caption: 'Sleighs ride along your Dock' }
    - { src: ./gallery-frost.jpg, alt: 'A browser window covered in frost', caption: 'Frost you melt away with your pointer' }
    - { src: ./gallery-wrapped.jpg, alt: 'A window wrapped in gold paper with a green bow and a gift tag', caption: 'Windows wrapped like presents' }
    - { src: ./gallery-lights.jpg, alt: 'Coloured string lights hanging under the menu bar', caption: 'String lights in warm white, gold or classic colours' }
    - { src: ./gallery-santa.jpg, alt: 'Santa’s sleigh flying across the desktop, dropping a present on a parachute', caption: 'Santa flies by with presents' }
  giftUrl: https://littledoors.app/christmas/gift
  signup:
    loopsList: cmwl2qnl501vv0j0p4h3g896h # Loops: "New editions and updates"
    title: 'The next edition'
    text: 'Get one email when the next Little Doors is out.'
summary: "Little Doors: Christmas is a digital advent calendar for the Mac. It lives in the menu bar, opens a new door each day until Christmas, and each door adds something to your desktop."
---

## Why

Every year my husband gets me an advent calendar or two: jewellery, skincare, candy, little accessories. The holidays have always been a big deal for us. This year, a few months after our son was born, he brought home a beauty advent calendar, and I wondered why there wasn't one for my computer. I'm on my laptop all day. I don't always notice the decorations around the house, but I'd notice something on my screen.

I looked for an advent calendar app for the Mac and couldn't find anything that does this. There are countdown widgets and wallpaper packs, but nothing where you open a door each day and it actually changes your desktop. [Check this against what you found, and name anything close.] So I built it. It's the first thing I've made that people pay for.

## What it does

1. Lives in the menu bar. Click the little door and the calendar opens: 25 doors, a surprise behind each one.
2. Behind the doors are things for your desktop. Decorate a Christmas tree, with a new ornament behind every door, then light it up. Build a snowman and hang stockings with the names you choose.
3. Some reach past the desktop. Sleighs ride along your Dock, even when it magnifies. String lights hang under the menu bar. Windows frost over, and you melt the frost with your pointer. Step away and your windows get wrapped like presents, ready to unwrap when you're back.
4. Make it yours: pick the snowman's hat and scarf, name the stockings, and save a look to come back to. When you need a clean screen, Hide all puts everything away with one shortcut.

## Hardest part

[The one problem that took the most work, and how you solved it.]

## What I learned

1. [Something about building a menu bar app with SwiftUI and AppKit together.]
2. [Something about shipping outside the App Store: signing, notarising, Sparkle updates.]
3. [Something about selling it: keys, payments with Dodo, gift emails with Loops.]
4. [Something about launching an indie Mac app on your own.]

## Launch

[Launch day, and where you posted it: Show HN, X, Product Hunt…]

[How it went, with honest numbers: two sales in the first few days, and what people said.]

[What you tried next, and what worked.]

## What's next

Christmas is the first edition. Spring is next, then Independence Day, and more after that.
