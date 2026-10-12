# Contributing · 参与贡献

[English](#english) · [中文](#中文)

## English

### Adding or changing a resource

All resources live in `js/resources.js`. Each resource is an object:

```js
{
  repo: "owner/name",              // optional: GitHub repo, shown as a "GitHub repo" link
  url: {                           // entry links
    def: "https://...",            // default (original) page
    zh: "https://...",             // optional: dedicated Chinese page
    es: "https://...",             // optional: Spanish page
    ja: "https://..."              // optional: Japanese page
  },
  kind: "course",                  // type of the default link: course | site | read | gh
  langs: ["en", "zh"],             // languages the content is actually available in
  code: 0,                         // coding needed: 0 none / 1 some / 2 solid
  stage: 1,                        // 1 start / 2 hands-on / 3 deeper
  goals: ["use", "build"],         // suitable goals: use AI / build tools / theory
  fields: ["all", "bio"],          // matching fields, see FIELDS in js/i18n.js; "all" means general
  type: "course",                  // video | course | tutorial | book | guide | roadmap | examples | collection | domain
  t: {                             // [name, description, how to read it] in four languages
    en: ["Name", "One or two sentences", "Where to start, what to skip"],
    zh: [...], es: [...], ja: [...]
  }
}
```

Guidelines:

- Make “how to read it” concrete: where to start, which parts need no code, what can be skipped at first.
- Mark glossary terms with `{id:display text}`, e.g. `{llm:large language models}`, so readers can tap them for an explanation. The glossary is `GLOSS` in `js/i18n.js`.
- Please open every link yourself before submitting.
- If you can't write all four languages, submit English and Chinese and mention it in the pull request; we'll fill in the rest.

### Other contributions

- Translation review: UI text is in `js/i18n.js`.
- Broken link or outdated description? Please open an issue.

## 中文

### 添加或修改资源

所有资源都在 `js/resources.js` 里，每个资源是一个对象：

```js
{
  repo: "owner/name",              // 可选：GitHub 仓库，会显示「GitHub 源仓库」链接
  url: {                           // 入口链接
    def: "https://...",            // 默认（原始）页面
    zh: "https://...",             // 可选：中文版专用页面
    es: "https://...",             // 可选：西班牙语版
    ja: "https://..."              // 可选：日语版
  },
  kind: "course",                  // 默认链接的类型：course | site | read | gh
  langs: ["en", "zh"],             // 内容实际提供的语言
  code: 0,                         // 编程要求：0 不用写代码 / 1 需要一点 / 2 需要熟练
  stage: 1,                        // 1 起步 / 2 动手 / 3 深入
  goals: ["use", "build"],         // 适合的目标：use 用 AI / build 做工具 / theory 学原理
  fields: ["all", "bio"],          // 对口领域，见 js/i18n.js 里的 FIELDS；all 表示通用
  type: "course",                  // video | course | tutorial | book | guide | roadmap | examples | collection | domain
  t: {                             // 四种语言的 [名称, 介绍, 打开后怎么读]
    zh: ["名称", "一两句介绍", "打开后先看哪、哪些可以跳过"],
    en: [...], es: [...], ja: [...]
  }
}
```

写作要求：

- 「打开后怎么读」要具体：从哪一课开始、哪些部分不用写代码、哪些可以先跳过。
- 文字里可以用 `{id:显示文字}` 标出术语，比如 `{llm:大模型}`，用户点一下就能看到解释。术语表在 `js/i18n.js` 的 `GLOSS` 里。
- 提交前请亲自打开链接确认可以访问。
- 如果写不了全部四种语言，可以先写英文和中文，在 Pull Request 里说明，我们会补上。

### 其他贡献

- 翻译校对：界面文字在 `js/i18n.js`。
- 发现链接失效或描述过时，欢迎直接开 Issue。
