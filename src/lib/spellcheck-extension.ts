/**
 * TipTap extension behind the custom spell checker. It turns misspelled-word
 * ranges into ProseMirror decorations (view-only: the document is never
 * modified) and reports right-clicks on a flagged word so the UI can open a
 * suggestions menu.
 *
 * Re-checking is debounced after edits, and decorations are merely remapped on
 * each transaction in between, so typing cost stays proportional to the edit,
 * not to the document size.
 */
import { Extension, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { docMisspellings } from './spellcheck';

/** A right-click on a flagged word. */
export interface SpellHit {
  from: number;
  to: number;
  word: string;
  /** Viewport coordinates of the click. */
  x: number;
  y: number;
}

export interface SpellcheckOptions {
  /** Read live, so toggling the preference needs no editor rebuild. */
  enabled: () => boolean;
  /** Called when the user right-clicks a flagged word. */
  onHit: (hit: SpellHit) => void;
}

interface SpellcheckState {
  decorations: DecorationSet;
}

const spellcheckKey = new PluginKey<SpellcheckState>('icarusSpellcheck');
const REFRESH = 'icarus:spellcheck-refresh';
/** Long enough to skip mid-keystroke churn, short enough to feel instant. */
const RECHECK_DELAY = 180;

function buildDecorations(doc: PMNode): DecorationSet {
  const ranges = docMisspellings(doc).map(({ from, to }) =>
    Decoration.inline(from, to, { class: 'spell-misspelled' }),
  );
  return DecorationSet.create(doc, ranges);
}

export const Spellcheck = Extension.create<SpellcheckOptions>({
  name: 'icarusSpellcheck',

  addOptions() {
    return { enabled: () => true, onHit: () => {} };
  },

  addProseMirrorPlugins() {
    const { enabled, onHit } = this.options;

    return [
      new Plugin<SpellcheckState>({
        key: spellcheckKey,

        state: {
          init: () => ({ decorations: DecorationSet.empty }),

          apply(tr, prev) {
            if (tr.getMeta(spellcheckKey) === REFRESH) {
              return {
                decorations: enabled()
                  ? buildDecorations(tr.doc)
                  : DecorationSet.empty,
              };
            }
            if (!tr.docChanged) return prev;
            // Cheap: keep the old marks aligned until the debounced recheck.
            return { decorations: prev.decorations.map(tr.mapping, tr.doc) };
          },
        },

        props: {
          decorations(state) {
            return (
              spellcheckKey.getState(state)?.decorations ?? DecorationSet.empty
            );
          },
        },

        view(view) {
          let timer: ReturnType<typeof setTimeout> | undefined;

          const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              timer = undefined;
              view.dispatch(
                view.state.tr.setMeta(spellcheckKey, REFRESH),
              );
            }, RECHECK_DELAY);
          };

          return {
            update(_view, prevState) {
              if (!prevState.doc.eq(view.state.doc)) schedule();
            },
            destroy() {
              clearTimeout(timer);
            },
          };
        },
      }),

      new Plugin({
        props: {
          handleDOMEvents: {
            contextmenu(view, event) {
              if (!enabled()) return false;
              const at = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!at) return false;
              const decorations = spellcheckKey.getState(view.state)
                ?.decorations;
              const hit = decorations
                ?.find(Math.max(0, at.pos - 1), at.pos + 1)
                .find((d) => d.from <= at.pos && at.pos <= d.to);
              if (!hit) return false;

              const word = view.state.doc.textBetween(hit.from, hit.to);
              if (!word) return false;

              event.preventDefault();
              onHit({
                from: hit.from,
                to: hit.to,
                word,
                x: event.clientX,
                y: event.clientY,
              });
              return true;
            },
          },
        },
      }),
    ];
  },
});

/** Recompute (or clear, if disabled) the underlines right now. */
export function refreshSpellcheck(editor: Editor): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(spellcheckKey, REFRESH).setMeta('addToHistory', false),
  );
}
