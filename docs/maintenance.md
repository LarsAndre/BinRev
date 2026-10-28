# Maintenance notes

Verification performed on 23 October 2026 using Node.js 22.22 and Windows Chrome
155. See [authoring.md](authoring.md) for the everyday writing workflow.

## Existing content warning

IcedID links to `Unpacking#1.1 - Setting breakpoints`, but that note is absent.
Preparation reports the unresolved link and renders a readable “note unavailable”
label. Add the missing note to a numbered section when its source is available.

## Browser comparison

The desktop SVG pixel-comparison test reports a mean pixel difference of 1.50455
against a threshold of 1 in this Windows Chrome environment. An untouched snapshot
of the original repository produces exactly the same result. The mobile version
passes. The viewer code and comparison threshold were preserved.

Functional browser checks cover section links, search, draft exclusion,
screenshots, theme persistence, legacy redirects, diagram controls, and downloads.
Development tests also create and remove a section and note, checking the page,
search entry, sitemap, and source link without restarting Astro.

## Dependency audit

A compatible lockfile update removed the DOMPurify critical advisory reported by
npm during installation. The production dependency audit reports zero advisories.
The complete dependency tree still reports 15 tooling advisories (6 high,
6 moderate, 3 low), chiefly in the Excalidraw/Mermaid export toolchain and its
transitive packages. The exporter is a local development tool and its packages
are not shipped in the static website. Both existing drawings export successfully.

Review these with `npm audit` when updating the diagram toolchain. The suggested
forced downgrade of Excalidraw was not applied; dependency changes should be
checked against drawing export and embedded screenshots.
