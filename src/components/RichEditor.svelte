<script lang="ts">
  /**
   * A Notion-style WYSIWYG editor. The source of truth is still Markdown (so it
   * round-trips cleanly to the `.ics` DESCRIPTION), but the user never sees the
   * raw syntax: typing `# `, `**bold**`, `- `, `> `, etc. formats live as you
   * type. TipTap (ProseMirror) does the editing; `tiptap-markdown` parses the
   * incoming Markdown and serialises it back out on every change.
   */
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import ListKeymap from '@tiptap/extension-list-keymap';
  import { Markdown } from 'tiptap-markdown';

  let {
    value = $bindable(''),
    placeholder = '',
    class: className = '',
  }: {
    value?: string;
    placeholder?: string;
    class?: string;
  } = $props();

  let editor = $state<Editor>();

  // The Markdown the editor currently represents. Used to tell our own changes
  // (typing) apart from external ones (opening a draft, reset after commit) so
  // we never feed the editor back its own output — which would jump the cursor.
  let lastValue = value;

  function editorHost(node: HTMLElement) {
    editor = new Editor({
      element: node,
      content: value,
      extensions: [
        StarterKit,
        Markdown.configure({
          html: false,
          tightLists: true,
          bulletListMarker: '-',
          linkify: true,
          breaks: true,
          transformPastedText: true,
        }),
        Placeholder.configure({ placeholder }),
        // Smart list editing: Backspace on an empty item lifts it back out to a
        // normal paragraph (natural position) instead of just dropping the marker.
        ListKeymap,
      ],
      editorProps: {
        attributes: { class: 'markdown min-h-full focus:outline-none' },
      },
      onUpdate: ({ editor }) => {
        lastValue = editor.storage.markdown.getMarkdown();
        value = lastValue;
      },
    });

    return {
      destroy() {
        editor?.destroy();
        editor = undefined;
      },
    };
  }

  // Push external value changes into the editor (draft opened, editor reset),
  // but skip our own edits — `lastValue` already matches those.
  $effect(() => {
    const incoming = value;
    if (!editor || incoming === lastValue) return;
    lastValue = incoming;
    editor.commands.setContent(incoming, false);
  });
</script>

<div use:editorHost class={className}></div>
