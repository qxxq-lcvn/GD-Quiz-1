# Unity Quiz · Weeks 1–2

A class quiz for Unity Weeks 1–2. Students pick **Class A** or **Class B**, answer a random set of questions from their class pool, and finish on a summary screen with their score and statistics.

Each class has a pool of 33 questions: 23 multiple choice and 10 True/False. No question appears in both classes.
Each attempt draws 23 of them at random: 16 multiple choice and 7 True/False. Students sitting together get different question sets, in a different order, with the answer options shuffled. Two attempts share about 16 questions on average.
To change the mix, edit `pick: { mcq: 16, tf: 7 }` for each class in `assets/js/data.js`. Smaller numbers mean less overlap between students.

Built with the dice-quiz pattern from the NGEP Mini-Quiz development plan, minus the dice: plain HTML, CSS and JavaScript, with no build step.

## Run it

- **Quickest:** double-click `index.html`. It works from `file://`.
- **Local server:**

  ```bash
  python -m http.server 5174
  ```

  Then open <http://localhost:5174>.
- **Direct class link:** `index.html?class=A` or `?class=B` skips the picker.
- **Deploy:** upload the folder to any static host. `vercel.json` is included for Vercel.

The page uses Google Fonts and the confetti library from jsDelivr. Offline, fonts fall back to system fonts and confetti is skipped.

## How it plays

1. **Pick a class.** Each tile shows that class's status on this device: question count, "Dara · 5 / 23 done" or "Dara · Score 18 / 23".
2. **Join.** The student types their full name and the class code. The code is checked online before the quiz starts.
3. **Answer.** Each question has a 15-second timer. The ring turns red and ticks for the last 5 seconds. If time runs out, a picked answer is still submitted. With no pick, the question counts as "Time's up".
4. **Result.** Shows right or wrong, highlights the correct answer and gives a short explanation.
5. **Summary** (after the last question). The result uploads automatically to the teacher's Google Sheet. If the upload fails, the summary shows a "Try saving again" button, and the page retries on the next visit. **Try again** stays disabled until the result is saved. The summary shows:
   - score ring (correct / total and %)
   - correct, wrong and time's-up counts
   - average answer time and total time
   - score for multiple choice vs True/False
   - score by topic, with bars
   - a review of every question: your answer and the correct one
   - **Try again** (new shuffled attempt) or **Change class**

Progress is saved on the device, so a reload continues the attempt. Class can't be changed while a question is on screen.

**Quit:** during an attempt, a **Quit** button shows in the top bar. After a confirmation, it deletes the attempt and goes back to the class picker. Nothing is uploaded. Choosing the class again asks for the code and draws a new random set. Quit is hidden once the last question is answered, so a finished attempt always reaches the summary and uploads.
Note: a student can use Quit to restart whenever a score looks bad. Only finished attempts appear in the results, so the teacher doesn't see how many times someone quit.

| Control | Action |
| :--- | :--- |
| <kbd>A</kbd> / <kbd>B</kbd> | Choose class |
| <kbd>1</kbd>–<kbd>4</kbd> (MCQ), <kbd>T</kbd> / <kbd>F</kbd> (True/False) | Pick an answer |
| <kbd>Enter</kbd> | Submit, then go to the next question |

Change `QUESTION_SECONDS` in `assets/js/app.js` to adjust the timer.

## Results backend (class codes and CSV export)

The quiz is a static site, so it stores results in a Google Sheet through a small Google Apps Script (`server/Code.gs`).
The class codes and the admin code are set in that script. They stay on Google's server, so students can't find them in the page source.

### One-time setup

1. Create a new Google Sheet (any name).
2. In the sheet, open **Extensions > Apps Script**.
3. Delete the sample code and paste the whole of `server/Code.gs`.
4. At the top of the script, change `CLASS_CODES` (one code per class) and `ADMIN_CODE`. Save.
   Change the codes **only in the Apps Script editor**, not in the local `server/Code.gs`. If you put the real codes in the local file and upload the folder to a web host, anyone can read them. `.vercelignore` leaves out `server/`, but other hosts don't.
5. Click **Deploy > New deployment**. Choose type **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy** and allow the permissions it asks for. Copy the **Web app URL** (it ends in `/exec`).
7. Paste the URL into `assets/js/config.js`:

   ```js
   window.QUIZ.CONFIG = {
     API_URL: "https://script.google.com/macros/s/XXXX/exec"
   };
   ```

8. Open the Web app URL in a browser. It should show `{"ok":true,"service":"unity-quiz"}`.

Results go to a tab called **Results** in the sheet. It is created on the first upload.

To change a code later, edit `Code.gs`, then use **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**. The URL stays the same.
Codes are not case-sensitive.

### Download results (teacher)

Click **Teacher** at the bottom of the quiz card and enter the admin code. The panel shows how many results there are, then gives three buttons:

- **All classes (CSV):** one row per attempt, with a compact `Answers` column (`a01=1 a02=0 a03=T`: 1 correct, 0 wrong, T time's up).
- **Class A (CSV)** / **Class B (CSV):** one row per attempt plus one column for every question in the pool (1 correct, 0 wrong or time's up, blank if that student didn't get the question), ready for Excel or Google Sheets.

Columns: Submitted At, Class, Student Name, Attempt (1st, 2nd… try by that name), Score, Total, Percent, Correct, Wrong, Timed Out, Avg Answer Time (s), Total Time (s), Started At, Finished At.
You can also read the **Results** tab in the Google Sheet directly.

### Limits

- The code check stops students who don't have the code. It isn't strong security: a student who shares the code lets others in, and names are not verified.
- A student can retake the quiz. Every finished attempt is a new row with its attempt number.
- Anyone with the Web app URL can try codes. Use codes that are hard to guess (for example `UNITY-A-7342`), not `1234`.
- Keep `ADMIN_CODE` private. It gives access to every student's name and score.

## Screenshots

Most questions refer to a screenshot. Put the images in `assets/img/questions/`, named after the question id (`a01.png` … `a23.png`, `b01.png` … `b23.png`).
Each question's `imageNote` in `assets/js/data.js` describes what the screenshot should show.
If a file is missing, the question shows a "Screenshot not added yet" box and the console logs which file it expected.
Questions a19, a21, a23, a24–a33, b19–b23 and b24–b33 have no screenshot.

## Editing questions

All content is in `assets/js/data.js`:

```js
mcq("a01", T.concepts, "What genre is this game?",
  ["Platformer", "RTS", "Racing", "Puzzle"], "A",          // options + correct letter
  "Explanation shown on the result screen.",
  "a01.png", "Mario-style side-scroller"),                  // screenshot file + note (optional)

tf("a19", T.ui, "Changes made in Play Mode are saved automatically.", false,
  "Explanation shown on the result screen."),
```

Multiple-choice options are shuffled each time, so the correct answer can be anywhere in the list. True/False always shows True first.
The console warns about duplicate ids, wrong option counts and out-of-range answers.

## Reset

Clear site data, or run `localStorage.clear()` in the browser console. This resets attempts saved on that device only. Uploaded results stay in the Google Sheet; delete rows there to remove them.

## Project layout

```
index.html              markup: class picker, join, question, result, summary and teacher views
assets/css/styles.css   theme, light and dark modes, responsive layout
assets/js/config.js     API_URL of the Apps Script web app  ← set once
server/Code.gs          Google Apps Script: class codes, admin code, results sheet
assets/js/data.js       palette + Class A / Class B questions  ← edit here
assets/js/audio.js      Web Audio sound effects (no audio files)
assets/js/app.js        game flow, timer, saved attempts, summary statistics
assets/img/questions/   question screenshots (add your own)
assets/audio/           optional bgm.mp3 background music
```
