"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  maxLength?: number;
}

export default function RichTextEditor({
  content,
  onChange,
  maxLength = 500,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const textContent = editor.getText();
      
      if (textContent.length <= maxLength) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 border border-gray-200 rounded-card",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const textLength = editor.getText().length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive("bold")
              ? "bg-[#7C3AED] text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive("italic")
              ? "bg-[#7C3AED] text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive("bulletList")
              ? "bg-[#7C3AED] text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          • Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive("orderedList")
              ? "bg-[#7C3AED] text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          1. Lista
        </button>
      </div>
      <EditorContent editor={editor} />
      <p className="text-xs text-gray-400">
        {textLength}/{maxLength} caracteres
      </p>
    </div>
  );
}
