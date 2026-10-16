# Tailwind CSS v4.3 reference for KAY

Status: current-version research and official documentation index; no Tailwind package installed and no upstream documentation text copied  
Date: 2026-10-14  
Confirmed decision: Tailwind CSS is the primary styling method for KAY; custom CSS is limited to justified exceptions.  
Technical proposal: use the [KAY styling guide](../../../04-design/styling.md) as the implementation convention, the [offline playbook](ESSENTIALS.md) for a compact overview, and the [full page index](INDEX.md) to navigate upstream details.  
References: [official documentation](https://tailwindcss.com/docs), [Next.js installation](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [npm `tailwindcss` package](https://www.npmjs.com/package/tailwindcss), [documentation repository](https://github.com/tailwindlabs/tailwindcss.com), [full page index](INDEX.md).

The npm `tailwindcss` package reports version **4.3.3** at this check. The official documentation site presents the **v4.3** series. The index was derived from the documentation repository at commit `7f92c2213315c195dae583d68752da4042da3ade` (2026-09-09). A website commit and a package release are different version markers; recheck both when the app is created or upgraded.

## Find what you need

| Need | Start here |
|---|---|
| Set up KAY's future Next.js app | [Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs), then [KAY installation notes](../../../04-design/styling.md#install-when-the-nextjs-app-exists) |
| Understand utility-first styling and reuse | [Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes) |
| Set colors, spacing, fonts, breakpoints, and other tokens | [Theme variables](https://tailwindcss.com/docs/theme), [colors](https://tailwindcss.com/docs/colors) |
| Build responsive layouts and interactive states | [Responsive design](https://tailwindcss.com/docs/responsive-design), [hover/focus/other states](https://tailwindcss.com/docs/hover-focus-and-other-states) |
| Choose light/dark behavior | [Dark mode](https://tailwindcss.com/docs/dark-mode); KAY's theme decision remains open |
| Handle class detection or dynamic variants | [Detecting classes](https://tailwindcss.com/docs/detecting-classes-in-source-files) |
| Add a genuinely needed CSS rule | [Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles), [functions and directives](https://tailwindcss.com/docs/functions-and-directives) |
| Check resets and compatibility | [Preflight](https://tailwindcss.com/docs/preflight), [compatibility](https://tailwindcss.com/docs/compatibility) |
| Locate a specific utility or any installation guide | [Full official-page index](INDEX.md) |

The [index](INDEX.md) lists **197 topic pages** and **19 framework guides**, plus the general installation routes, as found in that pinned source tree. It links to the live official pages; it does not work as a full offline replacement for them. The [offline playbook](ESSENTIALS.md) summarizes the major utility families in original prose, and the [styling guide](../../../04-design/styling.md) records KAY-specific conventions.

## Why this is a link index rather than a mirror

The [Tailwind documentation repository README](https://github.com/tailwindlabs/tailwindcss.com#license) says the website source is not under an open-source license and is available for education and minor fixes. Its terms are separate from the MIT-licensed Tailwind CSS framework. This project therefore does not redistribute the documentation site or its MDX pages. It records a complete page catalogue and original KAY implementation notes, with links back to Tailwind Labs for the full text and current examples.
