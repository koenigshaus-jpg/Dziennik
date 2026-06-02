"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { forwardRef, useEffect, useImperativeHandle } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export interface EditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { value, onChange, placeholder = "Co dziś było ważne?" },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose-base focus:outline-none text-lg leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useImperativeHandle(
    ref,
    () => ({
      insertText(text: string) {
        if (!editor || !text) return;
        const trimmed = text.trim();
        if (!trimmed) return;
        if (!editor.isFocused) {
          editor.chain().focus("end").insertContent(trimmed).run();
          return;
        }
        const { from, to } = editor.state.selection;
        editor.chain().focus().insertContentAt({ from, to }, trimmed).run();
      },
      focus() {
        editor?.commands.focus();
      },
    }),
    [editor]
  );

  return <EditorContent editor={editor} />;
});
