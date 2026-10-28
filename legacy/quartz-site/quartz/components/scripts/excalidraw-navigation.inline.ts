const excalidrawSidebarToggle = ".excalidraw-sidebar-toggle"

// The Excalidraw plugin binds its toggle directly during the `nav` event.
// On an SPA transition, the button can be replaced after that binding and is
// then inert until a hard refresh. Delegating from the persistent document
// keeps the control working for both initial loads and client navigation.
document.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) return

    const toggle = event.target.closest(excalidrawSidebarToggle)
    if (!toggle) return

    const page = toggle.closest<HTMLElement>('.page[data-frame="excalidraw"]')
    if (!page) return

    // Own this click so the plugin's direct listener cannot toggle the drawer
    // a second time on hard-loaded pages where it was attached successfully.
    event.preventDefault()
    event.stopImmediatePropagation()
    page.classList.toggle("excalidraw-sidebar-open")
  },
  { capture: true },
)
