# English 英文

The English topic. It has no lesson of its own and shows its subtopics as cards.

| Subtopic | Status | Design |
| -------- | ------ | ------ |
| Vocabulary 單字 | Word lists | [vocabulary/DESIGN.md](vocabulary/DESIGN.md) |
| Quiz 測驗 | To be done | [quiz/DESIGN.md](quiz/DESIGN.md) |

## Folder 資料夾

```
english/
├── DESIGN.md
├── content.json          lists "subtopics" at the top level
├── assets/images/        hero.jpg (banner) and CREDITS.md
├── vocabulary/
└── quiz/
```

## Subtopics 子主題

A topic can have subtopics, one level deep. The parent page shows them as cards. A subtopic page uses its parent's banner and links back to the parent.

To add one:

1. Create `public/topics/<topic>/<sub>/content.json` with `en` and `zh`. Use lowercase letters, numbers and `-` in the folder name.
2. Add `{ "slug": "<sub>", "title": {"en","zh"}, "summary": {"en","zh"} }` to `subtopics` in the parent's `content.json`.
3. Add a `DESIGN.md` to the new folder.
4. Restart the server, so it creates the matching database folder.

## Topic content format `content.json`

This format is the same for every topic and subtopic.

```json
{
  "subtopics": [],
  "en": {
    "title": "Math",
    "intro": "Short introduction.",
    "sections": [
      {
        "heading": "Fractions",
        "text":  ["Paragraph 1", "Paragraph 2"],
        "image": { "src": "images/pie.svg", "alt": "...", "caption": "..." },
        "list":  ["item", "item"],
        "code":  "preformatted text"
      }
    ],
    "quiz": [
      { "q": "Question?", "options": ["A", "B", "C"], "answer": 1 }
    ]
  },
  "zh": { "…same shape, Chinese text…" }
}
```

- `subtopics` is optional, and all section fields are optional except `heading`.
- `image.src` is relative to the topic's `assets/` folder and may include subfolders.
- `answer` is the zero-based index of the correct option.
- A topic with no sections, quiz or subtopics shows "To be done / 待完成".

## Assets 資產

Each topic has its own `assets/` folder, with any depth of subfolders. A topic with a lesson lists the whole folder in its Resources section.

`assets/images/hero.jpg` is the banner on the topic page and the card picture on the home page. Record each photo's creator, source and license in `assets/images/CREDITS.md`.
