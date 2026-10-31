# Brightloop Landing Page — Apple Design Rationale

The landing page applies the referenced Apple design skill to a web application context.

- **Purpose:** the hero explains Brightloop’s single job: connect subscription lifecycle, invoicing, payment allocation, and finance visibility.
- **Agency:** the primary action is explicit and reversible: “Open the workspace”; secondary links let visitors inspect the workflow before entering.
- **Responsibility:** the page avoids invented business metrics and describes role-aware access, scoped customer records, invoice source lines, and audit-ready changes.
- **Familiarity:** navigation, clear text buttons, a single prominent CTA, and familiar lifecycle language make the page immediately legible.
- **Flexibility:** the layout uses responsive sections, semantic HTML, labels for icon-led visuals, and reduced-motion-safe CSS.
- **Simplicity:** one primary CTA per major section, short copy, and progressive disclosure through the workflow sections keep the page focused.
- **Craft:** the visual system uses a restrained cream/ink surface, a distinctive green “moving/healthy” accent, and a red “needs attention” accent. The hero visual is a CSS-built billing workspace rather than generic stock art.
- **Delight:** the opening transition uses a short indeterminate loader that communicates a real workspace handoff without inventing progress.

Apple’s loading guidance says to show content as soon as possible, use indeterminate progress when remaining time is unknown, and provide clear feedback for unavoidable waits. The loading screen is therefore short, labeled, aria-live enabled, and not a fake percentage bar.

Apple’s button guidance recommends clear verb-led labels, enough hit area, visible press states, and one or two prominent buttons per view. The page uses “Open the workspace” and “Open Brightloop” as its prominent actions and keeps sign-in secondary.

Sources:
- https://github.com/dickwu/apple-design-skill
- https://raw.githubusercontent.com/dickwu/apple-design-skill/main/SKILL.md
- https://raw.githubusercontent.com/dickwu/apple-design-skill/main/references/hig/loading.md
- https://raw.githubusercontent.com/dickwu/apple-design-skill/main/references/hig/buttons.md
