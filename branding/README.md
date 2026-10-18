---
title: Kepvy Brand Magazine
description: Five generated Kepvy brand-guide pages with neutral dark grey, white and restrained beige.
created: 2026-10-11
updated: 2026-10-14
tags:
  - project
  - kepvy
  - branding
status: ready-for-review
---

# Kepvy Brand Magazine

## KAY-facing interface extension

Current KAY CRM branding (2026-10-18): [Riviera](riviera/README.md) supersedes the
older KAY-facing palette/font proposals. The KEPVY magazine below remains a
separate historical identity reference, not the current KAY application theme.

This page documents the **KEPVY** brand magazine, not the KAY Real Estate logo. On 2026-10-16 Khalid explicitly replaced the earlier KAY artwork with the supplied [transparent Champagne Gold](kay-logo-reference-flat.png) and [black-background Luxury Gold](kay-logo-reference-textured.png) PNGs. These two reference paths now contain the new originals unchanged, not the retired artwork. See [current logo usage and verification](kay-logos.md). They are approved raster assets, not vector masters. The KAY-facing [interface design system](../docs/04-design/design-system.md) and [exact UI tokens](kay-ui-tokens.json) remain separate from this KEPVY identity guide.

On 2026-10-18, the app's current KAY-facing palette and typography changed to
the owner-selected [Riviera system](riviera/README.md). That separate interface
handoff does not merge KEPVY and KAY logos or alter this brand magazine.

## Quick Jump

- [Project Overview](#-project-overview)
- [Goals](#-goals)
- [Tech Stack](#-tech-stack)
- [Documentation](#-documentation)
- [Key Design Decisions](#-key-design-decisions)
- [Current Status](#-current-status)
- [Open Questions](#-open-questions)
- [Related Notes](#-related-notes)

## 📋 Project Overview

Five generated editorial pages for the current Kepvy identity, following CalBook's brand-magazine layout: white explanatory rail, small icon-and-wordmark masthead, divider, generous whitespace and an application/specimen area.

The selected direction is the rounded parallel-stroke K with lowercase `kepvy`. These pages are ready for review; they do not establish an approved vector master, name clearance or an implemented app identity.

## 🎯 Goals

- Present the logo mark and horizontal icon + wordmark on light and dark surfaces.
- Keep the palette to three base colors with **neutral dark grey**, not brown, as the dark-mode canvas.
- Propose one primary text family and a clear starting type hierarchy.

## 🏗️ Tech Stack

| Layer | Method |
| --- | --- |
| Visual production | Built-in image generation using inspected reference images |
| Magazine layout | Existing CalBook pages as layout references only |
| Image delivery | Five local JPEG brand-guide pages; original source files and a hash manifest are not present here |
| Live-text proposal | Satoshi 400, 500 and 700 |
| Specifications | This guide and the [KAY UI tokens](kay-ui-tokens.json) |

No coded image renderer, font installation, app changes or external publication was performed.

## 📚 Documentation

| Page | File |
| --- | --- |
| 01 — Logo Mark | [Local JPEG](<WhatsApp Image 2026-10-11 at 17.12.32.jpeg>) |
| 02 — Primary Logo | [Local JPEG](<WhatsApp Image 2026-10-11 at 17.12.32 (1).jpeg>) |
| 03 — Color Palette | [Local JPEG](<WhatsApp Image 2026-10-11 at 17.12.32 (2).jpeg>) |
| 04 — Primary Typeface | [Local JPEG](<WhatsApp Image 2026-10-11 at 17.12.32 (3).jpeg>) |
| 05 — Typeface Hierarchy | [Local JPEG](<WhatsApp Image 2026-10-11 at 17.12.32 (4).jpeg>) |

There is no `manifest.json` or local PNG source set in this folder. The two logo pages above show the selected rounded-K direction; the written color and type specifications below are the local reference. Earlier concept sources are not included here, so source-to-copy hash verification cannot be claimed.

## 🔑 Key Design Decisions

### Color hierarchy

| Color | HEX | RGB | Role |
| --- | --- | --- | --- |
| White | `#FFFFFF` | 255 / 255 / 255 | Primary light-interface canvas; reversed logo and primary dark-mode text |
| Dark Grey | `#272727` | 39 / 39 / 39 | Neutral dark-mode canvas; light-mode text, logos and structure |
| Soft Beige | `#F6ECDA` | 246 / 236 / 218 | Small accent, highlights and selected-state fills with dark grey text |

The previous warm charcoal `#272622` is superseded **for these new magazine pages** by equal-channel grey `#272727`. It remains in historical concept images; they were not overwritten. No fourth brown brand color was introduced.

White leads light interfaces. Grey leads dark interfaces. Beige stays occasional rather than becoming the default canvas or reversed-logo color. Use a border, icon or label when a beige selection needs a clear boundary on white.

Calculated contrast for the specified colors: white/grey **14.94:1**, beige/grey **12.75:1**, beige/white **1.17:1**. Avoid beige text on white. These calculations refer to the hex specification, not every generated pixel.

### Primary typeface

**Satoshi** is the proposed live-text family: Regular 400 for body copy, Medium 500 for labels and subheadings, Bold 700 for headings. Official source: [Satoshi on Fontshare](https://www.fontshare.com/fonts/satoshi). Consult the publisher's [license information](https://www.fontshare.com/licenses) before implementation.

The logo wordmark remains selected artwork; do not claim its generated lettering is an exact Satoshi export or retype it to replace the current lockup. The magazine specimen is illustrative, not a font-software proof.

### Starting hierarchy

| Role | Weight | Size / line height (px) | Use |
| --- | --- | --- | --- |
| Display | 700 | 48 / 56 | Hero messages |
| Heading | 700 | 32 / 40 | Page and section titles |
| Subheading | 500 | 20 / 28 | Card titles |
| Body copy | 400 | 16 / 24 | Descriptions and content |
| Labels | 500 | 14 / 20 | Actions and navigation |
| Captions | 400 | 12 / 16 | Notes and helper text |

This is a proposed starting scale, not measured existing product tokens. Prefer 14 px or larger for essential interface information; use captions only for secondary supporting details.

### Logo usage

Use dark-grey artwork on white and white artwork on dark grey. Keep the rounded stroke construction, lowercase spelling and icon-to-wordmark relationship intact. No CRM/AI suffix or terminal dot was added. Preserve generous clear space; do not stretch, add outlines, shadows or extra effects.

## ✅ Current Status

| Item | Status | Evidence |
| --- | --- | --- |
| Five magazine pages | Ready for review | Five local JPEGs visually inspected |
| Copy integrity | Not verified against originals | Source files and hash manifest are absent from this folder |
| Page dimensions | Checked on local JPEGs | Four 1600 × 900 pages; hierarchy 1600 × 901 |
| Dark appearance | Visually checked and sampled | Background samples are near neutral grey; channel difference at most one |
| Exact specifications | Recorded | Authoritative HEX/RGB and type scale above |
| Existing assets | Preserved | CalBook and historical Kepvy sources unchanged |

Generated color pixels vary slightly: sampled dark backgrounds are around RGB 41–43 rather than exact RGB 39. Use the written hex values for implementation. Small contour, spacing and font differences may also remain in generated artwork.

## 📌 Open Questions

- [ ] Review the five-page magazine and confirm the proposed Satoshi family.
- [ ] Create and verify an outlined/vector logo master before production exports.
- [ ] Measure paired logo bounds, clear space and favicon/small-size performance.
- [ ] Produce exact font and color proofs if a print-ready or editable guide is required.
- [ ] Resolve the product's canonical project folder and name/legal clearance before deployment.

No existing Hive CRM SaaS project was renamed or assigned Kepvy.

## 🔗 Related Notes

- [[Projects/CalBook/branding/README|CalBook magazine layout reference]]
- [[Agentic Coding/Agent Memory/Graphic Designer/04 Continuation Handoff|Graphic Designer continuation]]
- [[Agentic Coding/Agent Memory/Graphic Designer/01 Operating Manual|Graphic Designer operating guidance]]

#project #kepvy #branding

