# KAY reference workspace source

The owner-supplied inner `kay` project is the visual reference for this branch.
The final stylesheet order is listed in its `src/main.js`. The foundation
uses the measured light and dark values, shared geometry and motion from that
cascade. [Design system](../../docs/04-design/design-system.md)

| Runtime asset | Reference path | SHA-256 |
| --- | --- | --- |
| `frontend/src/fonts/InterVariable.woff2` | `public/assets/InterVariable.woff2` | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| `frontend/public/images/workspace/kay-logo.svg` | `public/assets/kay-logo.svg` | `53f3d214c0246d9c127b6225d35ba385e1b60ed6f7f284a1db36605fd5282327` |
| `frontend/public/images/workspace/kay-pearl-atmosphere.png` | `public/assets/kay-pearl-atmosphere.png` | `7c443fad9a68adb73d4b740e49b634f014ab2c72f9fb85da82b90a7eeb482c88` |

The original Inter OFL, Lucide ISC/Feather and Bklit MIT notices remain in
`frontend/public/licenses/workspace/`. `kay-glyphs.json` pins the exact
Lucide 1.59.0 semantic glyphs and the WhatsApp mark from
[Simple Icons 16.31.0](https://github.com/simple-icons/simple-icons/blob/16.31.0/icons/whatsapp.svg),
used only for the chat shortcut. `kay-status.tokens.json` pins the reference's
status-family mappings and soft badge surfaces. `kay-workspace.tokens.json`
is the runtime source for appearance. Its `controlPx` and `layoutPx` sections
adapt shared geometry to existing callers pending each component/page review.
