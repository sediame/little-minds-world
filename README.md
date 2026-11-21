# Little Minds World — first functional MVP

## What works
- Personalised story form: child's first name, age (3–11), interests, story theme, language and reading level.
- AI story generation through the OpenAI Responses API when a server-side API key is configured.
- A built-in demo story mode when no API key is configured, so you can test the flow without spending money.
- Story reader with 3 comprehension/discussion questions.
- Save, read and delete stories in the browser's local storage.
- Navigation, six starter learning-lab cards and a simple progress counter.
- Responsive layout for phones, tablets and computers.

## Run locally
1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm start` (or `node server.js`).
4. Open http://localhost:3000.

## GitHub Actions and GitHub Pages
The workflow in `.github/workflows/pages.yml` builds and tests the static demo for pushes to `main` and pull requests targeting `main`. Successful pushes to `main` are published automatically to GitHub Pages; a manual run is also available from the Actions tab. The first deployment requires GitHub Pages to be configured to use **GitHub Actions** as its build and deployment source in the repository settings.

GitHub Pages for a private repository requires a GitHub plan that supports private-repository Pages. If the repository’s plan does not support it, either upgrade the plan or publish from a public repository.

GitHub Pages only hosts static files. The deployed Pages site is a browser-only demo: it uses built-in story templates and stores stories and progress in that browser. It does not provide parent accounts, AI stories, or AI chapter illustrations. Those features need a separately hosted Node.js backend; the GitHub Actions runner is temporary and does not host the app server.

## Enable real AI story generation
1. Copy `.env.example` to `.env`.
2. Add your OpenAI API key to `OPENAI_API_KEY`.
3. Set `OPENAI_MODEL` to a model available to your API project if `gpt-6` is not enabled for your account.
4. Restart the server.

The API key is read only by `server.js` and is never sent to the browser. API usage may incur charges. The demo mode does not call the API.

## Important MVP limitations
- Stories are saved only in the current browser/device. There are no parent accounts or cloud sync.
- Lab cards and progress are starter interactions, not complete lessons or validated learning assessments.
- No child photo uploads are included in this MVP. Add photo features only after a proper parent-consent, retention and deletion design.
- Before public launch, add authentication, per-user rate limits, abuse monitoring, privacy notices/parental consent, robust error handling, deployment HTTPS, and a production-grade database.
- This starter server is for local testing, not production deployment as-is.

## New in this update
- **Chapter illustrations:** The story reader now has an “Illustrate chapters” action. It requests one image per story paragraph from the OpenAI Images API. The same written character guide is sent for every chapter to encourage visual consistency (AI image generation cannot guarantee pixel-perfect character consistency). Set `OPENAI_IMAGE_MODEL` if needed; the default is `gpt-image-1`. Image generation may incur additional API charges.
- **Reading Teacher:** Browser speech synthesis reads the story aloud, supports pause/stop, and speaks a chosen practice word. The child can type or dictate an answer with a parent and receive encouraging feedback. Voice availability and quality depend on the browser/device language voices.
- **Parent Dashboard:** Shows saved story count, story sessions opened, words listened to, learning-lab completions, focus-lab activity and recent activity history. Data is stored in this browser only. It is an informal activity log, not a formal reading or attention assessment.

## Enable chapter illustrations
The illustration endpoint uses the same server-side `OPENAI_API_KEY`. It calls the image generation API for each chapter separately. Keep the key private in `.env`; never put it in HTML or browser JavaScript. You can optionally set `OPENAI_IMAGE_MODEL` in `.env`.


## New in this update — Story-linked Learning Lab Recommendations
- After a story is created, the app proposes age-appropriate labs connected to the child's story title, theme and interests.
- Recommendations include Reading, Brain, STEAM, Executive Function, Creative and Discovery activities, with shorter/more concrete options prioritised for younger children.
- The recommendation selector gently prioritises lab types with fewer recorded completions, using the activity history stored in this browser.
- Suggested missions appear in the Parent Dashboard for review. A parent can approve or skip each suggestion.
- Only approved story-linked missions appear in the child's “Ready for your next mission” list. A child can open a mission, see its purpose and task, then mark it complete.
- Completing an approved mission updates the local progress and activity history.
- This is a transparent, rule-based prototype, not an AI assessment. It does not diagnose, grade or infer a child's abilities. Parent review and adult supervision remain important, especially for hands-on STEAM tasks.
- Data is stored locally in this browser/device; no account or cloud sync is included.


## Visual, story-linked learning labs (updated)

The six child labs now offer interactive picture-based missions generated from the child's story interests and age:

- **Brain Lab:** memory matching and a picture-order puzzle (2–4 pairs/pieces by age).
- **Science Lab:** visual pattern prediction and a safe, grown-up-guided float prediction experiment.
- **Creative Lab:** tap-to-colour storybook scene with a colour palette.
- **Reading Lab:** picture-to-letter or picture-to-word matching.
- **Focus Lab:** spot the differences between two picture rows (1–3 differences by age).
- **Discovery Lab:** match a story-world object or character to its shadow.

The recommendation set includes all six labs. A parent still approves each mission before it becomes playable. Activities use local vector illustrations and emoji motifs, so they work without an additional image-generation API call. The number of cards, choices and puzzle steps adapts to the selected age band.


## Kid-friendly visual refresh (sticker-book look)
Presentation update — story generation, labs, approval flow and saved data work exactly as before.
- **Look:** bright flat colours, thick ink outlines and chunky buttons that press down. Each of the six labs has its own colour.
- **Fonts:** Lilita One (headings, buttons) and Nunito (reading text), loaded from Google Fonts in `index.html`.
- **Home:** a drawn hero scene (inline SVG) with tappable explorer and elephant, a "Make my story" button that jumps to the form, and emoji on every form field and option so younger children can follow it.
- **Phones:** navigation moves to a bottom tab bar; touch targets are at least 46px.
- **Celebrations:** a small confetti burst when a story is created or a mission is completed (`celebrate()` in `script.js`). It is skipped for people who have "reduce motion" turned on.
- **Parents page:** deliberately calmer (white cards, thin lilac borders) so it reads as a grown-up area.
- **Reading:** the story reader uses larger text with short line lengths.
- All element IDs and class names used by `script.js` are unchanged.


## Parent accounts and child profiles
The app now opens on a **Log in / Create account** screen.
- **Sign-up (3 steps):** parent email and password, then how many children (1–6), then each child's name or nickname, age (3–11), a picture and what they like. The parent confirms they are a parent or guardian.
- **Who's playing?** After logging in, each child taps their own picture. Their name, age and first interest pre-fill the story form. The picture in the top bar switches child. With one child the picker is skipped.
- **Per-child data:** saved stories, progress, approvals and activity history are stored in the browser under that account and child, so siblings never see each other's stories.
- **Parents area:** "Your family" shows the children and lets a parent edit, add or remove them (up to 6). Settings has **Log out** and **Delete my account** (asks for the password).
- Story and illustration requests now require a logged-in session. If it ends, the app returns to the login screen.

### How accounts are handled (`server.js`)
- Passwords are hashed with scrypt and a random salt. They are never stored or returned in plain text.
- Sessions use a random token in an `HttpOnly`, `SameSite=Lax` cookie (14 days). Only a hash of the token is stored.
- Sign-up, login and delete are rate-limited per IP and per email.
- Accounts and child profiles live in `data/accounts.json` (git-ignored). That is fine for local testing, but use a real database before a public launch.
- Behind HTTPS, set `COOKIE_SECURE=true` in `.env` so the cookie is only sent over secure connections.
- Stories and progress are **not** synced to the server. They stay in the browser on the device where they were made.

### Before a public launch
Add password reset by email and email verification, a parent-only gate (such as re-entering the password) for the Parents area so children cannot approve their own activities, a privacy notice and consent wording suited to your country (GDPR / children's data), backups for the accounts store, and a production database.


## Animal buddy welcome video
After a child is chosen, a short animated video (about 25 seconds) plays once per visit for that child.
- **Star:** the child's own animal (for example Finn the Fox) says hello by name, introduces its animal friends, invites the child to make a story, and shows the six labs with a star for each one.
- **Controls:** Pause, Skip (or Esc), Sound on/off, then **Let's go!** (jumps to the story form) or **Watch again** on the last screen. Captions are always shown. The sound choice is remembered.
- **Voice:** it uses the browser's built-in speech. It starts on when the parent has already tapped something on the page (the login does), and it can be switched off with one tap.
- **Replay:** the **Watch the video** button on the Home page plays it again any time.
- **Buddy tips:** the child's animal also leaves a short nudge on the Home and Games pages that follows their progress, from "Let's make a story" to "Ask a grown-up to unlock your games" to "3 of 6 stars!". Finishing all six labs triggers a celebration.
- It is drawn in code (emoji, CSS and a little JavaScript), so it is personalised with no video file to host. `welcome-video-preview.webm` is a screen recording of it. To use a real recorded video instead, replace the scene code in `script.js` (search for "Animal buddy") with a `<video>` element.
