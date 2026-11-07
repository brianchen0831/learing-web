# Vocabulary 單字

Word lists for learning English. Each list is stored in the database, and the page shows the selected list with its meanings, Chinese and examples.

每個單字表都存放在資料庫中，頁面會顯示所選單字表的解釋、中文與例句。

## Page 頁面

`content.json` has `"view": "wordlist"` at the top level, which shows word lists instead of a lesson.

- **Sidebar:** shows the word lists as a folder view and has the **+ New list** button. The folder holding the selected list opens by itself. The arrow at the top folds the sidebar, and the choice is remembered in the browser (`localStorage`, `wordlist.folded`).
- **Selected list:** kept in the URL, for example `/topics/english/vocabulary?list=grade1/animals`. An unknown list falls back to the first one.
- **Table:** a word with several meanings spans several rows.
- **Dictionary link:** each word links to `https://dictionary.cambridge.org/dictionary/english/<word>`. Spaces in a phrase become `-`.
- **Pronunciation:** the speaker button left of each word reads it aloud with the browser's speech engine (`src/speech.js`). It prefers a Google voice, which Chrome provides; other browsers use their own English voice. The button is hidden if the browser has no speech engine.

Main code: `src/components/WordList.js`, `src/components/WordListTree.js`, `src/components/WordDialog.js`, `src/views/WordListEditorView.js`.

## New list page 新增單字表

`/topics/english/vocabulary/new` has the list name at the top and **+ Add word** below it. Each word opens a pop-up, where **+ Add meaning** adds another meaning. Words can be edited or removed before saving, and leaving with unsaved work asks for confirmation.

A word needs at least one filled-in meaning. Saving needs a list name and at least one word.

## Word list format 單字表格式

Each list is one JSON file in the database, for example `database/english/vocabulary/animals.json`. Lists can sit in folders at any depth, and folder names may use Chinese:

```
database/english/vocabulary/
├── animals.json
└── grade1/
    ├── part1.json
    └── review/
        └── part2.json
```

A list's id is its path without `.json`, for example `grade1/review/part2`. Names starting with `.` are skipped.

```json
{
  "title": { "en": "Animals", "zh": "動物" },
  "words": [
    {
      "word": "fish",
      "meanings": [
        { "meaning": "an animal that lives in water", "chinese": "魚", "example": "We saw many fish in the sea." },
        { "meaning": "to try to catch fish", "chinese": "釣魚", "example": "We fish in the lake every summer." }
      ]
    }
  ]
}
```

| Field | Required | Meaning |
| ----- | -------- | ------- |
| `title` | no | List name in `en` and `zh`; the file name is shown if it is missing |
| `words` | yes | The words, in display order |
| `word` | yes | The English word; also builds the dictionary link |
| `meanings` | yes | One entry per meaning of the word |
| `meaning` | no | Meaning in English |
| `chinese` | no | Meaning in Chinese |
| `example` | no | Example sentence |

- You can also add a list by saving a `.json` file in the folder and refreshing the browser. No restart is needed.
- A file that breaks these rules still appears in the sidebar, marked as having errors, but cannot be selected.
- New lists from the site are saved at the top of the folder, and can be moved into a subfolder by hand. They are named after the list name, for example `my-words.json`, or `list.json` when the name has no English letters or numbers. A number is added if the name is taken, so existing files are never replaced.
- A list created on the site stores its name in both `en` and `zh`.
- The default `database/` folder is not in git, so a fresh clone starts with no word lists.

## API 介面

| Endpoint | Returns |
| -------- | ------- |
| `GET /api/wordlists/<topic>/<sub>` | Every list, including subfolders, folders first: `[{ "id", "title", "count" }]`, or `{ "id", "invalid": true }` for a broken file. Empty if there are none. |
| `GET /api/wordlists/<topic>/<sub>/<id>` | The whole list; `404` if it is missing, broken, or the path leaves the folder |
| `POST /api/wordlists/<topic>/<sub>` | Creates a list from `{ "title": "name", "words": [...] }` and returns `201` with `{ "id" }`, or an `{ "error" }` message |

Saving only accepts `application/json` requests up to 1 MB from this site's own pages (`Host` must be `localhost` or `127.0.0.1`, and `Origin` must match), so other websites open in the browser cannot write to the database. `<topic>/<sub>` must be a real subtopic.

## Not done yet 尚未完成

Saved lists cannot be edited or deleted on the site. Change or delete the file in the database folder instead.
