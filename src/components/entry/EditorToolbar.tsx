"use client";

import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
} from "lucide-react";
import { useEffect, useReducer } from "react";
import { cn } from "@/lib/utils";

interface Props {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: Props) {
  // Force re-render whenever selection / content / formatting changes
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    const handler = () => forceRender();
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor]);

  if (!editor) {
    return <div className="h-9" aria-hidden />;
  }

  const btn = (
    label: string,
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 transition-colors",
        "hover:bg-foreground/10 hover:text-foreground",
        active && "bg-foreground/10 text-foreground"
      )}
    >
      {icon}
    </button>
  );

  const sep = (
    <span
      className="mx-0.5 hidden h-4 w-px bg-border lg:inline-block"
      aria-hidden
    />
  );

  return (
    <div
      // Safety net: ensure clicks anywhere on toolbar (gaps between buttons)
      // don't steal focus from the editor.
      onMouseDown={(e) => e.preventDefault()}
      className="flex h-9 items-center gap-4 px-1 lg:gap-0.5"
    >
      {btn(
        "Akapit",
        editor.isActive("paragraph") &&
          !editor.isActive("heading"),
        () => editor.chain().focus().setParagraph().run(),
        <Pilcrow className="h-3.5 w-3.5" />
      )}
      {btn(
        "Nagłówek 1",
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        <Heading1 className="h-4 w-4" />
      )}
      {btn(
        "Nagłówek 2",
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        <Heading2 className="h-4 w-4" />
      )}
      {btn(
        "Nagłówek 3",
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        <Heading3 className="h-4 w-4" />
      )}
      {sep}
      {btn(
        "Pogrubienie",
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        <Bold className="h-3.5 w-3.5" />
      )}
      {btn(
        "Kursywa",
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        <Italic className="h-3.5 w-3.5" />
      )}
      {sep}
      {btn(
        "Lista punktowana",
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        <List className="h-3.5 w-3.5" />
      )}
      {btn(
        "Lista numerowana",
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        <ListOrdered className="h-3.5 w-3.5" />
      )}
      {btn(
        "Cytat",
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        <Quote className="h-3.5 w-3.5" />
      )}
    </div>
  );
}
