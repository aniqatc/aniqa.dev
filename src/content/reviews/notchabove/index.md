---
app: NotchAbove
maker: capt_sherman
# makerLink: https://bsky.app/profile/handle # optional: link @maker somewhere else instead (Bluesky, Threads, their site…)
date: 2026-11-06
type: Mac app
triedOn: MacBook M4 Pro, macOS Golden Gate 27.2
live: notchabove.xyz
device: desktop
desktop: notch
# shadow: false # optional, for a Mac app: when the capture already has its own shadow
# price: Free # optional: Free, $4.99 one-time, $3/mo
version: 1.3.5
platforms: [Mac]
# post: https://x.com/aniqatc/status/… # optional: the review's post on X
summary: A Mac notch app that switches your audio, tracks your AI coding tools and Git, and comes with a pet to look after.
verdict: Delightful
quote: It literally brings me joy
# cardTheme: day # optional: the scorecard and link preview in the lab's light colours (night by default)
stillUsing: true
brand: '#1a59e4'
scores: # 1 to 5: 4–5 shows as Polished, 3 Getting there, 1–2 Needs love
  firstImpression: 5
  onboarding: 5
  bestFeature: 5
  easeOfUse: 5
  value: 5 # pricing / value
screenshotAlt: 'The NotchAbove pet panel hanging from the notch: a black cat sitting between its food and water bowls in a sunny room, saying it’s had a quiet day and would like an eye break, with Pet, Feed, Water and Play buttons, today’s care rings for rest, water, focus and a found gift, and one of eight treasures collected. Below it, the toolbar of NotchAbove’s tools, with Pet care selected, and a lock button.'
---

## TL;DR

The notch has always been underused for me. I only ever used it to hold the time, so there was more room in the menu
bar for my apps. NotchAbove freed up that space straight away: it let me delete Vorssaint, Raycast and
[another productivity app]. It fills the notch with the things I reach for all day: audio switching, my AI coding
tools, Git, gentle reminders, a shelf for files and, as a bonus, a black cat named Bombay. It has more than I thought
I needed, but I'm glad to have all of it within easy reach. It's packed with features but feels light, like a native
app, and it's one of the few apps that genuinely brings me joy.

## First look

Downloading it took one extra step: I had to strip the quarantine flag before macOS would let it open on my MacBook.
That's happened with almost every indie app I've tried, so it's not a knock on NotchAbove.

I downloaded NotchAbove halfway through its landing page, so I missed that it comes with a companion and about a
dozen other useful features. I took it for the meeting and calendar view, volume control and webcam preview, and for
being able to customise the notch border and the app's overall look.

Finding Bombay, a beautiful black cat, was such a pleasant surprise. Instead of opening my phone for half a TikTok
between meetings, I can spend that time looking after her, and she peeks out of the notch (if you want her to)
without being distracting. She's really cute, and a great way to keep me off social media in quiet moments.

There's so much packed into it, and that was exciting: I can see it replacing some of my apps and making my work and
development workflow easier over time. Finding all the extra features was a pleasant surprise, and you'll see below
that I'm using quite a lot of them. Usually this many features would overwhelm me, but you can opt in and out of each
one and keep only what you'll actually use.

## What I liked

1. **The pet.** I'm a sucker for a good mascot or companion. I like my tools minimal, but a well-done Easter egg
   brings real joy, as you might notice from the pet on this site that changes with the seasons. Taking care of
   Bombay ![Bombay the black cat licking a paw in a rainy room, saying "...thank you. Don't tell anyone.", above the Pet, Feed, Water and Play buttons and today's care rings](./pet-care-rain.png "note: Bombay on a rainy day, just after a pet") and collecting gifts for her gives me a reason to come back, and it's a joy to use. It's
   better than doomscrolling on social media, which can distract me for too long; this is a healthy break with a dose
   of cuteness. And if a cat isn't your thing, you can pick a different pet.

   ![NotchAbove's companion picker: Bombay (selected), Turkish Van, Orange Tabby, Silver Tabby, Golden Retriever, Husky, Labrador, Shiba Inu, Capybara, Ghost, Penguin, Baby Dragon, Fox, Bunny, Red Panda and Panda](./companions.png)
   _All sixteen companions, from Bombay to a baby dragon_

2. **Volume control.** This is one of the features that got me interested in the first place. Switching between Zoom
   and Spotify keeps changing my audio settings, and when I'm watching Loom videos attached to bug reports, the volume
   changes even more. It's worse again when I move from my laptop to my desktop setup and back. Here I can set each
   device's volume before I switch and save my preferences, so getting back to them is a hover over the notch and a
   click ![NotchAbove's shortcut settings: cycle output device set to Option Command O, and open the notch, quick switcher, mute microphone and show or hide lyrics waiting for a shortcut](./settings-shortcuts.png "note: Shortcuts, like cycling the output device from any app"). It's clearer than the Mac's own volume handling, it's easier to get to, and I don't
   have to fight it.
3. **Reminders that don't feel wrong.** I hate water and stand-up reminders in the usual notification spot. They
   shouldn't take up the same space as an iMessage, and I don't want them on my watch either. Other reminders always
   felt so loud that I'd eventually block them out. NotchAbove is subtle enough to remind me ![The focus panel: a Pomodoro timer set to 25 minutes, a countdown, a stopwatch and a hydration glass at 5 of 8](./focus-timers.png "note: Pomodoro, countdown, stopwatch and hydration") without
   disrupting me, so I remember I need a break ![The affirmation panel: "Keep going. You're closer than it feels.", shown every 2 hours, with Show now and Another buttons and a box to write your own](./affirmations.png "note: Affirmations arrive the same gentle way") but can finish what I'm doing first. The
   rest-your-eyes reminder ![The eye breaks panel: look 20 feet away for 20 seconds every 45 minutes, next in 26:49, with Blink, Figure 8, Near & far and Palming exercises](./eye-breaks.png "note: Eye breaks every 45 minutes, with short exercises") has me blinking more ![The Near & far exercise filling the screen: a glowing yellow dot on a grid that runs to the horizon, with the instruction to look at your thumb a hand's length away](./eye-exercise-near-far.png "note: The Near & far exercise takes over the whole screen") after long stretches of
   coding or debugging ![The eye settings: a shortcut to rest my eyes now, and a note that it's for resting eyes, not treating them](./settings-eye-shortcut.png "note: A shortcut to rest your eyes right away"), and it shows me how much time has passed ![The system panel: battery at 99%, CPU, memory and disk rings, keep awake, and 1h 29m on screen today across Arc, Visual Studio Code and GitHub](./system-stats.png "note: Screen time today, with battery and system stats"). As
   someone with chronic dry eyes, this was a nice surprise to try.
4. **Git at a glance.** Lately I've been cleaning up my GitHub and portfolio, which means going back through old
   projects and fixing issues. Seeing my Git status ![The Git panel: three repositories, all clean and up to date, no open pull requests, and a 14-day commit streak](./git-repos.png "note: Every repo at a glance, plus pull requests and a commit streak") means I don't forget to clean up a branch or
   commit. I love having this a glance away.
5. **AI agent usage.** Tracking Claude Code, Codex and Cursor in one place ![The Coding panel for Codex: a weekly usage limit at 100%, an activity heatmap, 3.7M tokens, and no sessions right now](./coding-usage.png "note: Usage limits and an activity heatmap, per tool") is major. A quick look
   at their limits is nice to have, especially to keep me on track.
6. **The shelf.** I handle files for different clients at work, and my Downloads folder gets ugly fast, and it gets
   ugly when I'm working on personal projects too. Now I put what I need for the week on the shelf ![The shelf holding two documents, with Drag all, AirDrop and Clear buttons](./shelf.png "note: The shelf, with two files on it (their names blurred)") instead
   of sifting through Downloads. When I was working on some insurance documents, I put everything I needed for the
   email on the shelf for easy access. Loved it.
7. **Calendar view.** I plan my work days by time blocking, so having it in the notch ![The Calls panel: a camera check, no more meetings today, a November calendar with Monday's meetings, and a list of microphones](./calls-calendar.png "note: The calendar with a camera check and microphones (meeting names blurred)") helps.
8. **Clipboard history.** I was reluctantly using Raycast for this. It's built around keyboard shortcuts and I never
   enjoyed it, but it was better than nothing. I'm so happy to have deleted it: clipboard history is a hover away
   now ![The clipboard panel: recent copies from Visual Studio Code and Arc, including a localhost link, a branch name and git commands](./clipboard.png "note: Clipboard history, newest first") ![Clipboard settings: keep clipboard history, keep the last 100 items, and a note that it never keeps passwords or keys and stays on this Mac](./settings-clipboard.png "note: It skips passwords and anything that looks like a key").
9. **Little extras.** The birthday countdown ![The weather panel: heavy rain at 65°, an hourly forecast, clocks for New York and San Francisco, and an age counter with days to my birthday](./weather-clocks-birthday.png "note: Weather, world clocks and the birthday countdown") is awesome, and the camera preview
   ![The camera check starting up: a mirrored preview of the MacBook Pro camera, with a note that nothing is recorded](./camera-starting.png "note: The camera check starting up, mirrored and never recorded") ![The camera check with the camera off, and its effects and reactions: hearts, likes, balloons, rain, confetti, fireworks and lasers](./camera-effects.png "note: The camera check, with effects and reactions") reminds me to switch to my dedicated webcam instead of joining a call on
   the MacBook one. It's also a quick way to check that my lighting and background look good.
10. **Make it yours.** There are 21 tabs, which felt like a lot at first, but you can remove what you don't need. You
    can customise the look ![NotchAbove's settings window on the Notch page: curved or square corners, hiding the notch, how the panel closes, and the shine border](./settings-notch.png "note: Notch settings, from the corners to the shine border") and pretty much everything else, and add keyboard shortcuts if you
    want to (I won't). It's all there, but it's just as easy to ignore, which I appreciate for a simple, quick
    workflow.

    ![NotchAbove's tab grid: three rows of icons, with the paw-print Pet care tab selected](./tabs.png)
    _The tab grid, with Pet care open_

11. **Easy permissions.** Granting what it needs was simple, with no guesswork.

## What I didn't use

1. **Window management.** I don't really manage my windows. My desktop has enough space that I haven't needed it.
2. **Todos.** ![The todo panel: a task to take screenshots of notchabove.xyz with a 3:07 PM reminder, and writing this review done today](./todo.png "note: The todo list, reminding me to take these screenshots") Glad it's there, but work keeps me on Linear, and my personal tasks live on my phone anyway.
3. **Tools.** ![The calculator in Tools: 95,000 + 346,000 = 441,000, with a Copy button](./calculator.png "note: The calculator in Tools") Handy if you need exchange rates quickly (they're up to 12 hours old) or some quick
   maths.
4. **Sales.** ![Sales settings: a Dodo Payments API key and mode, and new-sale alerts that show in the notch](./settings-sales.png "note: Sales from Dodo Payments, with alerts in the notch") Not for me yet, but if I ever become an indie builder, a notification for every
   sale must be a nice dopamine hit.
5. **Games.** ![The games: Dragon Flap, Stack, 404 Run, Sky Hop and Treat Catch, each with a best score of 0](./settings-games.png "note: Five games, all still at a best score of 0") I've been busy with my pet, but as an avid gamer, I know I'll reach for these when I
   finally get a day to be bored.

Even the things I haven't needed are nice to have.

## Small ideas

1. **Expand notes and snippets, lightly.** I dictated a few notes ![The notes panel: two notes as tabs, an empty note, and buttons to dictate, copy and delete](./notes.png "note: Notes, typed or dictated"), and I could see saving code snippets
   for debugging or useful prompts there too. Code syntax highlighting would be nice, maybe as something you can
   turn on for a note.
2. **Save notes as Markdown files.** I take notes in Obsidian, and so many people use Markdown editors. Having
   dictated notes land as Markdown files inside my own notes system would be awesome: Obsidian keeps everything in
   local files anyway, so I'd route my notes there and they could sync to my phone or iPad.

## Who it's for

Whether you're technical or not, it's easy to use out of the box. All kinds of productivity tools live in one spot,
and it doesn't ask you to learn or memorise a whole new setup. It's for anyone whose notch is going to waste, who
wants a native-feeling app for everyday tools, and especially anyone who loves a good mascot. I'm shocked one person
made something this thoughtful.
