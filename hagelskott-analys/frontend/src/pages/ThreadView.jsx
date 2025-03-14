import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card"; // Anpassa till hur du importerar Card-komponent
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  ArrowLeftCircle,
  Edit3,
  Trash2,
  Flag
} from "lucide-react";

import Avatar from "@/components/ui/Avatar";          // Skapa i src/components/ui/Avatar.jsx
import ReactionBar from "@/components/ui/ReactionBar"; // Skapa i src/components/ui/ReactionBar.jsx
import MyRichEditor from "@/components/ui/MyRichEditor"; // Om du använder egen RTE, annars ReactQuill
import "react-quill/dist/quill.snow.css";

// ============================
// 1) Hjälpfunktion: Parsar text
//    ersätter bildlänkar & Youtube-länkar
// ============================
function parseAndFormatContent(contentHtml) {
  // Egen approach: antingen använd regex eller DOMParser.
  // Nedan enkel regex-exempel (OBS: regex + HTML kan vara knepigt).
  let replaced = contentHtml;

  // 1) BILD-länkar (png/jpg/jpeg/gif) -> <img src="..." />
  const imgRegex = /(https?:\/\/\S+\.(?:png|jpe?g|gif))/gi;
  replaced = replaced.replace(imgRegex, (match) => {
    return `<img src="${match}" alt="image" style="max-width: 100%; margin:8px 0;" />`;
  });

  // 2) YouTube-länkar -> <iframe> (obs: förenklat)
  //   Ex: https://www.youtube.com/watch?v=xxx
  //   Ersätt med embed-länk: https://www.youtube.com/embed/xxx
  const ytRegex = /https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_\-]+)/gi;
  replaced = replaced.replace(ytRegex, (match, group1) => {
    // group1 = själva video-id, ex: cXWteZmdGLM
    return `
      <iframe width="560" height="315" 
              src="https://www.youtube.com/embed/${group1}"
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              style="display:block; margin:8px 0;">
      </iframe>
    `;
  });

  return replaced;
}

export default function ThreadView() {
  const { threadId } = useParams();
  const navigate = useNavigate();

  // Data om tråden
  const [thread, setThread] = useState(null); // title, content, author_id, ...
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nytt inlägg
  const [newContent, setNewContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit-läge
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [editError, setEditError] = useState(null);

  // "Följ tråd" state
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchThreadData();
  }, [threadId]);

  async function fetchThreadData() {
    setLoading(true);
    setError(null);

    try {
      // 1) Hämta trådinformation
      const resThread = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}`
      );
      if (!resThread.ok) {
        throw new Error("Kunde inte hämta trådinformation.");
      }
      const dataThread = await resThread.json();
      setThread(dataThread);

      // 2) Hämta inlägg
      const resPosts = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts`
      );
      if (!resPosts.ok) {
        throw new Error("Kunde inte hämta trådens inlägg.");
      }
      const dataPosts = await resPosts.json();
      setPosts(dataPosts);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ett oväntat fel uppstod vid hämtning av tråd.");
    } finally {
      setLoading(false);
    }
  }

  // Uppdatera inläggslistan
  async function reloadPosts() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts`
      );
      if (!res.ok) {
        throw new Error("Kunde inte uppdatera inläggslistan.");
      }
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Uppdatering av inlägg misslyckades:", err);
    }
  }

  // ============= Skapa nytt inlägg ==================
  async function handleCreatePost() {
    setCreateError(null);
    setCreatingPost(true);
    try {
      const token = localStorage.getItem("token");
      // Sätt ex author_id utifrån inloggad user?
      const body = {
        content: newContent,
        author_id: "anonymousUser" // Byt ev. mot inloggad user
      };
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
          },
          body: JSON.stringify(body)
        }
      );
      if (!res.ok) {
        throw new Error("Kunde inte posta inlägget. Kontrollera om du är inloggad?");
      }
      setNewContent("");
      await reloadPosts();
    } catch (err) {
      console.error(err);
      setCreateError(err.message || "Ett fel uppstod vid postande av inlägg.");
    } finally {
      setCreatingPost(false);
    }
  }

  // ============= Börja redigera inlägg ==================
  function startEditPost(post) {
    setEditingPostId(post.id);
    setEditingContent(post.content);
    setEditError(null);
  }
  function cancelEdit() {
    setEditingPostId(null);
    setEditingContent("");
  }
  async function handleSaveEdit(postId) {
    setEditError(null);
    try {
      const token = localStorage.getItem("token");
      const body = { content: editingContent };
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts/${postId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
          },
          body: JSON.stringify(body)
        }
      );
      if (!res.ok) {
        throw new Error("Kunde inte uppdatera inlägget.");
      }
      setEditingPostId(null);
      setEditingContent("");
      await reloadPosts();
    } catch (err) {
      console.error(err);
      setEditError(err.message || "Ett fel uppstod vid uppdatering av inlägg.");
    }
  }

  // ============= Radera inlägg ==================
  async function handleDeletePost(postId) {
    const confirmDel = window.confirm("Vill du verkligen radera inlägget?");
    if (!confirmDel) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined
          }
        }
      );
      if (!res.ok) {
        throw new Error("Kunde inte radera inlägget.");
      }
      await reloadPosts();
    } catch (err) {
      console.error(err);
      alert("Fel vid radering av inlägg: " + err.message);
    }
  }

  // ============= Reagera (emoji) på inlägg ==================
  function handleReaction(emoji, postId) {
    console.log("Användaren reagerade med", emoji, "på inlägg", postId);
    // Ex: anropa endpoint: POST /api/forum/posts/{postId}/react
    // (ej implementerat i backend-exemplet ovan).
  }

  // ============= Följ tråd ==================
  async function handleFollowThread() {
    // Dummy-exempel: toggla en local state
    // men i verkligheten: POST /api/forum/threads/:id/follow
    setIsFollowing(!isFollowing);
    console.log(isFollowing ? "Avfölj" : "Följ", "tråd", threadId);
  }

  // ============= Anmäl tråd ==================
  async function handleReportThread() {
    // dummy: confirm-låda
    const reason = prompt("Varför anmäler du tråden?");
    if (!reason) return;
    // Skicka anmälan: ex. POST /api/forum/threads/:id/report
    console.log("Anmäler tråd pga:", reason);
    alert("Tack, anmälan skickad (låtsas).");
  }

  // =================== Render ===================
  if (loading) {
    return (
      <div className="flex h-[60vh] justify-center items-center">
        <div className="flex flex-col items-center gap-2 text-gray-700">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <p>Laddar tråd...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tråden hittades inte.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 1) Parsad text med youtube-länkar & bilder
  const parsedThreadContent = parseAndFormatContent(thread.content);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">

      {/* Top-del: Banner + titel */}
      <div className="relative w-full h-32 bg-black bg-opacity-40 bg-center bg-cover"
           style={{ backgroundImage: 'url("/imgs/forum_bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white p-4">
          <h1 className="text-2xl font-bold">{thread.title}</h1>
          <p className="text-sm mt-1">Skapad av <span className="font-semibold">{thread.author_id}</span></p>
          <p className="text-xs">Visningar: {thread.views}</p>
        </div>
      </div>

      {/* Knapprad: Tillbaka + Följ tråd + Anmäl */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/forum")}
          className="flex items-center gap-1 text-sm px-3 py-1 rounded hover:bg-gray-100 transition"
        >
          <ArrowLeftCircle className="w-4 h-4 text-gray-500" />
          <span>Tillbaka</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFollowThread}
            className={`px-3 py-1 rounded text-sm hover:bg-gray-100 transition 
              ${isFollowing ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"}`}
          >
            {isFollowing ? "Följer" : "Följ tråd"}
          </button>
          <button
            onClick={handleReportThread}
            className="px-3 py-1 rounded text-sm text-red-600 hover:text-red-800 hover:bg-red-50 transition flex items-center gap-1"
          >
            <Flag className="w-4 h-4" />
            Anmäl
          </button>
        </div>
      </div>

      {/* Trådstart: text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Trådstart</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="forum-post-content text-sm text-gray-800"
            dangerouslySetInnerHTML={{ __html: parsedThreadContent }}
          />
        </CardContent>
      </Card>

      {/* Lista av inlägg */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Inlägg ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Inga inlägg ännu. Var först med att kommentera!</p>
          ) : (
            posts.map((post) => {
              const isEditing = editingPostId === post.id;
              // Parsad text
              const parsedPostContent = parseAndFormatContent(post.content);

              return (
                <div key={post.id} className="p-3 border border-gray-200 rounded">
                  {/* Avatarrad */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <Avatar username={post.author_id} />
                    <span className="font-medium">{post.author_id}</span>
                    {post.created_at && (
                      <span className="ml-auto">
                        {new Date(post.created_at).toLocaleString("sv-SE")}
                      </span>
                    )}
                  </div>

                  {/* Innehåll (edit-läge eller vanlig vy) */}
                  {isEditing ? (
                    <>
                      <MyRichEditor
                        value={editingContent}
                        onChange={val => setEditingContent(val)}
                      />
                      {editError && (
                        <p className="text-xs text-red-500 mt-1">{editError}</p>
                      )}
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={cancelEdit}
                          className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Avbryt
                        </button>
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Spara
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      className="mt-1 text-sm text-gray-800 forum-post-content"
                      dangerouslySetInnerHTML={{ __html: parsedPostContent }}
                    />
                  )}

                  {/* ReactionBar + Edit/Delete */}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <ReactionBar onReact={(emoji) => handleReaction(emoji, post.id)} />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEditPost(post)}
                        className="text-yellow-600 hover:text-yellow-800 flex items-center gap-1"
                        title="Redigera inlägg"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        title="Radera inlägg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Nytt inlägg */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Nytt inlägg</CardTitle>
        </CardHeader>
        <CardContent>
          {createError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <MyRichEditor
              value={newContent}
              onChange={(val) => setNewContent(val)}
            />
            <div className="flex justify-end">
              <button
                onClick={handleCreatePost}
                disabled={creatingPost || !newContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition disabled:opacity-60"
              >
                {creatingPost && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Skicka</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
