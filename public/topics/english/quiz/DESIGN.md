# Quiz 測驗

Vocabulary tests built from the word lists in [Vocabulary](../vocabulary/DESIGN.md).

以[單字](../vocabulary/DESIGN.md)的單字表為題庫的單字測驗。

## Page 頁面

`content.json` has `"view": "vocabulary-test"`, and `"source"` names the subtopic that holds the word lists.

Before the test, the student:

1. Chooses word lists from a checklist with **Select all** and **Clear**. It shows the same folders as Vocabulary, and a folder's checkbox selects everything inside it.
2. Chooses the test type.
3. Chooses the number of questions: Full, 10, 15, 20, or a custom whole number.
4. Chooses whether to show a picture hint, for test types that have one.

The selected words are combined and shuffled, and a word in two lists is only asked once. Full asks every word. A number picks that many at random, or all of them if there are fewer. The test ends after the last word or with **End test**, and the result is shown on the same page. It is also saved as the last score, shown on the Quiz card on the English page.

Main code is in `src/components/english/quiz/`, the same path as this topic: `VocabularyTest.js` (the setup and the test page), `WordListChecklist.js` (choosing word lists), and `PictureHint.js` for the picture shared by all test types. Each test type has its own folder there, named after its type id.

## Test types 測驗類型

### Fill in the blank 填空

`src/components/english/quiz/fill-blank/FillBlankTest.js` (type id `fill-blank`)

- Shows a random word with every letter hidden except the first and last, for example `a _ _ _ _ _ t`. Spaces, hyphens and apostrophes stay visible.
- Below it are all the word's Chinese meanings. If it has none, its English meanings are shown instead.
- The student types only the missing letters, which fill the blanks as they type. Capital letters do not matter.
- Each question gets one try. The word is then shown with a **Search Google Images** link.
- Words with no hidden letter, such as `at`, are left out.

### Hangman 猜單字

`src/components/english/quiz/hangman/HangmanTest.js` (type id `hangman`)

- The whole word is hidden and there are no hints: no Chinese meaning and no picture during the round. Spaces, hyphens and apostrophes stay visible.
- The word, its meaning and a picture are shown when the round ends. The picture is only requested then, so it cannot give the word away.
- The student guesses letters with the on-screen buttons or the keyboard. On the keyboard, **Enter** moves to the next word after a round.
- Six wrong guesses are allowed, and each adds a part to the drawing. Guessing a used letter costs nothing.
- A round scores a point if the word is finished. Otherwise the word is shown.
- Words with fewer than two letters A–Z are left out.

### Listening 聽寫

`src/components/english/quiz/listening/ListeningTest.js` (type id `listening`)

- Nothing about the word is shown. It is read aloud by the browser's speech engine when the question opens, and again with **Play the word** or more slowly with **Slowly** (`src/speech.js`, the same voice as the word lists' pronunciation button).
- **Hear a sentence** reads one of the word's example sentences (from its meanings) aloud, so the word can be heard in context. Nothing is shown; each press reads the next sentence when there are several. After the answer is checked, the sentences are shown, each with a 🔊 button. The button is greyed out for a word with no example.
- The student types the whole word in the box below. Capital letters, extra spaces and curly apostrophes do not matter.
- Each question gets one try. Then the word, its Chinese meanings and a **Search Google Images** link are shown, and the picture if **Show a picture after each answer** is on. The picture is only requested then, so it cannot give the word away.
- Words with no letter are left out. If the browser cannot read aloud, the type cannot be chosen.

### Adding a type 新增類型

1. Create a folder named after the type id in `src/components/english/quiz/`, such as `spelling/`, with a component that takes `words` and emits `finish` with `{ score, answered }`.
2. Add it to `TEST_TYPES` in `src/components/english/quiz/VocabularyTest.js`, with a `canAsk(word)` function. To offer the picture hint, add `pictures: true`, and the component also receives a `pictures` prop.
3. Add its name to `src/i18n.js`.
4. For its results to count toward tasks, add the type id to the accepted test types in `account/rewards.py`.

## Pictures 圖片

The picture hint comes from [Openverse](https://openverse.org), which needs no key. The word is sent to Openverse from the student's browser, so pictures only appear when online. Without a result, the question simply has no picture.

- It uses the first result with mature content filtered out. Results are not checked by a person, and abstract words such as `across` can give unrelated pictures. That is why the hint can be turned off.
- Openverse images are openly licensed but most require credit, so the creator and license are shown under each picture.
- Google Images cannot be shown inside the page without Google's paid-setup API, so it is offered as a link after answering. Showing it earlier would reveal the word.
