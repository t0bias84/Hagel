/**
 * MyRichEditor.jsx
 * ===============
 * En specialversion av ReactQuill som automatiskt omvandlar bildlänkar eller YouTube-länkar
 * när användaren skriver/klistrar in dem. Passar i ditt projekt som en ersättning för
 * traditionella <ReactQuill>-anrop i t.ex. NewThread eller ThreadView.
 */

import React, { useRef, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function MyRichEditor({
  value = "",
  onChange,
  placeholder = "Skriv något...",
  modules,
  formats,
  ...props
}) {
  const quillRef = useRef(null);

  /**
   * handleChange
   * -----------
   * Reagerar på alla textändringar i editorn.
   * Sök i den del av texten som just skrivits/klistrats in efter:
   *   - Bildlänkar (t.ex. slutar på .png/.jpg/.gif)
   *   - YouTube-länkar (youtu.be eller youtube.com/watch)
   * Om träff -> infoga <img> eller inbäddad <iframe>.
   */
  const handleChange = useCallback(
    (content, delta, source, editor) => {
      if (source === "user") {
        const quill = quillRef.current?.getEditor();
        if (!quill) {
          onChange?.(content);
          return;
        }

        const ops = delta?.ops || [];
        // Enkla regexar för bild- resp. YouTube-länkar
        const imageRegex = /(https?:\/\/[^\s]+?\.(png|jpg|jpeg|gif))/gi;
        const youtubeRegex =
          /(https?:\/\/(?:www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+))/gi;

        ops.forEach((op) => {
          if (op.insert && typeof op.insert === "string") {
            const insertedText = op.insert.trim();

            // 1) Bild-URL?
            const imageMatch = insertedText.match(imageRegex);
            if (imageMatch) {
              const currentPos = quill.getSelection()?.index || 0;
              quill.deleteText(currentPos - insertedText.length, insertedText.length);

              imageMatch.forEach((imgUrl) => {
                quill.insertEmbed(currentPos, "image", imgUrl, "user");
              });
            }

            // 2) YouTube-länk?
            const youtubeMatch = insertedText.match(youtubeRegex);
            if (youtubeMatch) {
              const currentPos = quill.getSelection()?.index || 0;
              quill.deleteText(currentPos - insertedText.length, insertedText.length);

              // Förenklad tolkning av videoId
              // Ex: "https://youtu.be/VIDEOID" eller "?v=VIDEOID"
              const link = youtubeMatch[0];
              let videoId = "";
              if (link.includes("youtu.be/")) {
                videoId = link.split("youtu.be/")[1] || "";
              } else if (link.includes("v=")) {
                videoId = link.split("v=")[1] || "";
              }
              // Trimma bort ev. &feature= etc
              if (videoId.includes("&")) {
                videoId = videoId.split("&")[0];
              }

              // Bygg embed-url
              const embedUrl = `https://www.youtube.com/embed/${videoId}`;
              const iframeHtml = `<iframe width="560" height="315" src="${embedUrl}" frameborder="0"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>`;

              quill.clipboard.dangerouslyPasteHTML(currentPos, iframeHtml, "user");
            }
          }
        });
      }

      // Skicka ut eventet till föräldern
      onChange?.(content);
    },
    [onChange]
  );

  return (
    <ReactQuill
      ref={quillRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      // Minimalt standard-toolbar, justera fritt
      modules={
        modules || {
          toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ header: 1 }, { header: 2 }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            ["clean"]
          ],
        }
      }
      formats={
        formats || [
          "header",
          "bold",
          "italic",
          "underline",
          "strike",
          "list",
          "bullet",
          "link",
          "image"
        ]
      }
      className="bg-white"
      {...props}
    />
  );
}
