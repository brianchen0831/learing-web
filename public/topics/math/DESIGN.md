# Math 數學

The Math page has two subtopics, with the banner from `assets/images/hero.jpg`:

- **Quiz 測驗** (`quiz/content.json`, `"view": "paper-quiz"`): answer a paper one question per page.
- **Solutions 解析** (`solutions/content.json`, `"view": "paper-solutions"`): the answers and worked solutions of every paper.

Both read the papers in `"source": "math/quiz"`. The content format is in [../english/DESIGN.md](../english/DESIGN.md).

## Quiz page 測驗頁

Main code is in `src/components/math/quiz/` (the same path as this topic): `PaperQuiz.js` (paper list, pages, results), `PaperQuestion.js` (one question) and `paper.js` (checking answers).

1. **Pick a paper.** The papers are shown in the same folders as in the database (`grade2 › imc › <paper folder> › paper`), drawn by `src/components/common/FolderTree.js` like the Solutions page; folders open with a click. The picked paper is kept in the URL (`?paper=<id>`), and its number of questions, points and time are shown next to the folders with **Start test**. **Other papers** after finishing comes back here with the same paper picked.
2. **One question per page.** The header shows the part, the question number and the points so far. Numbered page buttons jump to any question; checked ones turn green (right), red (wrong) or green-edged (partly right). **Previous** and **Next** move one page.
3. **Answer and check.** Multiple choice: tap (A)–(D). Fill in: type in the box, with the unit after it. Calculation: answer boxes (a group of boxes per answer set, or one input per answer field, with choices as a list), plus a box for the working, which is not marked. **Check** marks the question once; then only the result is shown (correct, partly correct or wrong, with the points). The correct answer is never shown in the quiz: in multiple choice only the student's own pick turns green or red. The answers and worked solutions (解析) are on the Solutions page.
4. **Finish** shows the points and correct answers for each part and how many were not answered, with **Review answers**, **Try again** and **Other papers**. The total is saved as the page's last score.

Checking (`paper.js`): spaces and full-width digits do not matter, and a typed unit is ignored (`２０７ 元` is `207`). Answer sets are found in any order; when not all are found, each found set scores the `each` points from `scoring`. Results are not sent to the account and do not count toward tasks.

The server serves papers from the database (`server.py`): `GET /api/papers/<topic>/<sub>` lists them, `.../<paper id>` gives one, and `.../<path>.png` (or `.jpg`, `.gif`, `.webp`) gives a figure. Only topic folders are served, never anything outside them, and `images` and `results` folders are not listed as papers.

## Solutions page 解析頁

`src/components/math/solutions/PaperSolutions.js`. The sidebar lists the papers in the same folders as in the database (`grade2 › imc › paper`), drawn by `src/components/common/FolderTree.js` (shared with Vocabulary); the folder holding the open paper opens by itself. The open paper is kept in the URL (`?paper=grade2/imc/imc-20-taiwan-final-grade2`), so a link opens it directly; without one, the first paper opens.

The paper shows its title, points and time, then each part with its points per question, and every question with its figure, its options (the right one in green), the answer and the solution (解析).

## Quiz papers 測驗卷

Math quizzes are whole papers, kept in the database by grade and source:

```
<database>/math/quiz/<grade>/<source>/<paper id>/
    <paper id>.json      the paper
    images/              its figures, named <section>-<number>-<what>.png
```

Each paper has its own folder, with its figures in it. The papers so far, all with the answers and worked solutions (解析) from their PDFs:

| Folder in `grade2/imc/` | Paper | Questions | Points | PDF |
| ----------------------- | ----- | --------- | ------ | --- |
| `imc-20-taiwan-final-grade2` | 第二十屆國際數學競賽台灣區複賽 國小二年級 | 8 choice, 8 fill-in, 2 calculation | 100, 90 min | `20240325100028_0.pdf` |
| `imc-21-taiwan-preliminary-grade2` | 第二十一屆國際數學競賽台灣區初賽 國小二年級 | 25 choice, 2 calculation | 300, 60 min | `20241216112118_1.pdf` |
| `imc-21-taiwan-final-grade2` | 第二十一屆國際數學競賽台灣區複賽 國小二年級 | 8 choice, 8 fill-in, 2 calculation | 100, 90 min | `20250418093858_0.pdf` |
| `imc-22-taiwan-preliminary-grade2` | 第二十二屆國際數學競賽台灣區初賽 國小二年級 | 20 choice, 5 fill-in, 2 calculation | 300, 60 min | `20251201103125_1.pdf` |

The 21st preliminary PDF has a blank answer table, so its answers come from the solutions; every answer of all four papers was checked against the PDF's answer table or by working it out again.

### Paper format

| Key | Meaning |
| --- | ------- |
| `id`, `title` (`zh`, `en`), `grade`, `contest` | Which paper it is |
| `source` | The PDF it came from |
| `time_limit_minutes`, `total_points` | As printed on the paper |
| `sections` | In order; each has `id`, `type`, `title`, `points_each` and `questions` |

Section `type`:

| Type | Question keys |
| ---- | ------------- |
| `choice` | `options` (`{"A": …, "B": …}`) and `answer` (the letter). `free: true` marks a question given to everyone (送分): any answer scores. |
| `fill` | `answer` (text, compared as typed) and an optional `unit` shown after the blank (`元`, `位`) |
| `calculation` | Working must be shown (`show_working`). One of: `answer` as text with an optional `unit`; `answer` as an object with `answer_fields`; or `answer_sets` with `answer_rule: "all_sets"` when every listed set is needed. `answer_text` is the answer as written, and `scoring` lists partial points. |

`answer_fields` makes one input per part of the answer: `key` (its key in `answer`), `label`, then `choices` (a list to pick from) or `unit`. A field with `count` above 1 takes that many values in any order, and its `answer` is a list (such as two flavors, or "200 元 or 205 元"). For a question in parts, `points` gives each field's points; `each` gives points per right value of a field that is not wholly right. All fields right always scores the full points.

Every question has `id` (such as `fill-3`), `number`, `question` (`___` marks a blank, `\n` a new line), `solution` (lines of the worked solution) and, when it needs one, `figure` (a path under the paper's folder). `table` holds a figure's table as data when it has one. `solution_figure` is a figure for the solution, shown on the Solutions page. `note` is shown on the Solutions page (such as 此題送分). `fixed` notes a typo corrected from the PDF.
