"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EditorToolbar } from "./EditorToolbar";
import { cn } from "@/lib/utils";

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
  const [focused, setFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
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

  // Track focus/blur to drive toolbar visibility. Blur is delayed so that
  // clicking on a toolbar button (which preventDefaults mousedown — focus stays
  // — but we still want a safety net) doesn't hide the bar.
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      setFocused(true);
    };
    const onBlur = () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        setFocused(false);
        blurTimeoutRef.current = null;
      }, 150);
    };
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [editor]);

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

  return (
    <div className="relative">
      {/* Reserved-height toolbar row — children fade in/out so text never jumps */}
      <div
        className={cn(
          "sticky top-0 z-10 -mx-1 mb-1 border-b border-transparent bg-background/80 backdrop-blur transition-opacity duration-150",
          focused
            ? "border-border/60 opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <EditorToolbar editor={editor} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});
