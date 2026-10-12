# AI Roadbook

**Tell us who you are, and we'll tell you what to learn first.**

[中文](README.zh-CN.md) · English · [Español](README.es.md) · [日本語](README.ja.md)

👉 **Try it: https://ll-code663.github.io/ai-roadbook/**

There are plenty of great free AI courses online. What stops beginners usually isn't finding them—it's not understanding them and not knowing where to start. Many of the best courses live on GitHub, where newcomers are greeted by a wall of folders and jargon.

AI Roadbook tackles exactly that step.

## What's different

- **It asks about you first.** A few quick questions: do you work, in what field, what do you study, what are you interested in. Less common majors and jobs can pick interests instead, and every step has a “not sure / skip” option.
- **A route, not a list.** Recommendations are laid out in three stages—start, hands-on, deeper—with only the best few picks in each.
- **It tells you how to read each course.** Every resource comes with a short guide, like “Lessons 1–5 need no code; you can skip Lesson 6 onward at first.”
- **It links you to the easiest way in.** If a version in your language exists, the button goes straight there. If there's an online reader, you don't have to dig through GitHub.
- **Built for true beginners.** Zero-barrier mode only recommends courses that need no coding and no GitHub; jargon has tap-to-explain definitions; there's a GitHub guide for first-timers.
- **Four languages.** 中文, English, Español and 日本語—and links switch to the matching language version.

It covers 47 free resources from Microsoft, Hugging Face, Google, Anthropic, Datawhale, Andrew Ng, Hung-yi Lee and more.

## Run locally

Nothing to install. Download the repository and open `index.html` in your browser.

## Project structure

```
index.html          page structure
css/style.css       styles
js/i18n.js          UI text (four languages), glossary, fields of study, occupations and interests
js/resources.js     resource data (edit this file to add or change resources)
js/app.js           onboarding flow, recommendation logic, rendering
```

## Contributing

Good resources from your field and fixes to descriptions or links are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Especially helpful:

- AI learning resources for less common majors and professions
- Alternatives that are easy to access from mainland China (e.g. Bilibili, icourse163)
- Native speakers reviewing the Spanish and Japanese translations

## Notes

- Each resource is maintained by its own authors and platform. Chapters, translations and pricing change; the original page is the source of truth.
- Your answers are stored only in your own browser and are never uploaded anywhere.
- For uses involving health, law or investing, have a professional review the conclusions.

## License

- Code: [MIT](LICENSE)
- Resource descriptions and reading guides: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
