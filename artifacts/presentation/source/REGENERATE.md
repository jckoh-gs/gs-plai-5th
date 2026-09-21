# Presentation reproduction

Exact input: config.original.json. Portable input: config.portable.json. Run from the presentation folder with Node and the artifact-tool/presentation skill runtime installed:

    node source/build-deck.mjs source/config.portable.json --rehearsal

Set RUNTIME_NODE_MODULES, RUNTIME_PYTHON and PRESENTATION_SKILL for this computer. Install the Apple SD Gothic Neo font or deliberately revise the font policy and review all slides. The rebuild is labeled a rehearsal; it cannot replace the verified final package or bypass its freeze/video-first guards. Source evidence links resolve from the delivered repository root. Keep the sibling video folder for the notes reference ../video/GRID-VPP-demo-ko.mp4. No credentials are required to rebuild the deck. When present, facts.original.json preserves the exact reviewed facts, and deck-binding-input.json records the original repository-relative binder inputs. The copied binder sources explain that preparation; regeneration from config.portable.json uses the already-bound deck content and is always a rehearsal.
