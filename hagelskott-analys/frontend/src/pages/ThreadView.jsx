import React, { useEffect, useState, useRef } from "react";
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
  Flag,
  Check,
  Bell
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
  const [successMsg, setSuccessMsg] = useState(null);

  // Nytt inlägg
  const [newContent, setNewContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit-läge
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState(null);

  // "Följ tråd" state
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const quillRef = useRef();

  useEffect(() => {
    fetchThreadData();
  }, [threadId]);

  async function fetchThreadData() {
    setLoading(true);
    setError(null);

    try {
      // 1) Hämta trådinformation
      const token = localStorage.getItem("token");
      const resThread = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!resThread.ok) {
        throw new Error("Could not fetch thread information.");
      }
      const dataThread = await resThread.json();
      setThread(dataThread);
      setIsFollowing(dataThread.is_following || false);

      // 2) Hämta inlägg
      const resPosts = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!resPosts.ok) {
        throw new Error("Could not fetch replies.");
      }
      const dataPosts = await resPosts.json();
      setPosts(dataPosts);
    } catch (err) {
      console.error("Failed to fetch thread data:", err);
      setError(err.message || "An error occurred while fetching thread data.");
    } finally {
      setLoading(false);
    }
  }

  // Uppdatera inläggslistan
  async function reloadPosts() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Could not update replies.");
      }
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Failed to update replies:", err);
      setError(err.message || "An error occurred while updating replies.");
    }
  }

  // ============= Skapa nytt inlägg ==================
  async function handleCreatePost() {
    if (!quillRef.current) return;

    const content = quillRef.current.getEditor().root.innerHTML;
    if (!content.trim()) return;

    setCreateError(null);
    setCreatingPost(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) {
        throw new Error("Could not post reply.");
      }
      quillRef.current.getEditor().setText("");
      await reloadPosts();
    } catch (err) {
      console.error(err);
      setCreateError(err.message || "An error occurred while posting reply.");
    } finally {
      setCreatingPost(false);
    }
  }

  // ============= Börja redigera inlägg ==================
  function startEditPost(post) {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setEditError(null);
  }
  function cancelEdit() {
    setEditingPostId(null);
    setEditContent("");
  }
  async function handleSaveEdit(postId) {
    setEditError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/posts/${postId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editContent }),
        }
      );
      if (!res.ok) {
        throw new Error("Could not update reply.");
      }
      setEditingPostId(null);
      setEditContent("");
      await reloadPosts();
    } catch (err) {
      console.error(err);
      setEditError(err.message || "An error occurred while updating reply.");
    }
  }

  // ============= Radera inlägg ==================
  async function handleDeletePost(postId) {
    const confirmDel = window.confirm("Are you sure you want to delete this reply?");
    if (!confirmDel) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Could not delete reply.");
      }
      await reloadPosts();
      setSuccessMsg("Reply deleted!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete reply.");
    }
  }

  // ============= Reagera (emoji) på inlägg ==================
  function handleReaction(emoji, postId) {
    console.log("Reaction:", emoji, "on post:", postId);
    // Implement reaction logic here
  }

  // ============= Följ tråd ==================
  async function handleFollowThread() {
    try {
      const token = localStorage.getItem("token");
      const endpoint = isFollowing ? "unfollow" : "follow";
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error(`Could not ${endpoint} thread`);

      setIsFollowing(!isFollowing);
      setSuccessMsg(isFollowing ? "Unfollowed thread" : "Following thread");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  // ============= Anmäl tråd ==================
  async function handleReportThread() {
    if (!reportReason.trim()) {
      setReportError("Please provide a reason for reporting");
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/threads/${threadId}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: reportReason }),
        }
      );

      if (!res.ok) throw new Error("Could not submit report");

      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason("");
      }, 2000);
    } catch (err) {
      console.error(err);
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  }

  // =================== Render ===================
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="bg-dark-800 border-red-600">
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
          <AlertDescription>Thread not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 1) Parsad text med youtube-länkar & bilder
  const parsedThreadContent = parseAndFormatContent(thread.content);

  return (
    <div className="container mx-auto px-4 py-8 text-white">
      {/* Tillbaka-knapp och trådtitel */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-white hover:text-blue-400 transition-colors"
        >
          <ArrowLeftCircle className="w-5 h-5 mr-2" />
          Back to category
        </button>
        <button
          onClick={handleFollowThread}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isFollowing
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-dark-700 text-white hover:bg-blue-600"
          }`}
        >
          {isFollowing ? "Following" : "Follow thread"}
        </button>
      </div>

      {/* Trådtitel */}
      <Card className="mb-6 bg-dark-900 border-dark-700">
        <CardHeader className="p-6">
          <CardTitle className="text-3xl font-bold text-white">
            {thread?.title}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Inläggslista */}
      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} className="bg-dark-900 border-dark-700 hover:border-dark-600 transition-colors">
            <CardContent className="p-6">
              {/* Författarinfo */}
              <div className="flex items-center justify-between mb-6 border-b border-dark-700 pb-4">
                <div className="flex items-center">
                  <Avatar
                    src={post.author?.avatar}
                    alt={post.author?.username}
                    className="w-12 h-12 rounded-full bg-dark-700"
                  />
                  <div className="ml-4">
                    <p className="text-lg font-semibold text-white">
                      {post.author?.username || "Anonymous"}
                    </p>
                    <p className="text-sm text-gray-300">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => startEditPost(post)}
                    className="p-2 text-gray-300 hover:text-yellow-400 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleReportPost(post.id)}
                    className="p-2 text-gray-300 hover:text-orange-400 transition-colors"
                    title="Report"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Inläggsinnehåll */}
              {editingPostId === post.id ? (
                <div className="space-y-4">
                  <MyRichEditor
                    value={editContent}
                    onChange={setEditContent}
                    className="bg-dark-800 text-white border-dark-600"
                  />
                  {editError && (
                    <Alert variant="destructive" className="bg-dark-800 border-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{editError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 text-sm bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(post.id)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-invert max-w-none text-lg leading-relaxed text-gray-100"
                  dangerouslySetInnerHTML={{
                    __html: parseAndFormatContent(post.content),
                  }}
                />
              )}

              {/* Reaktioner */}
              <div className="mt-6 pt-4 border-t border-dark-700">
                <ReactionBar
                  reactions={post.reactions}
                  onReact={(emoji) => handleReaction(emoji, post.id)}
                  className="text-gray-300"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nytt inlägg */}
      <Card className="mt-8 bg-dark-900 border-dark-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Write a reply
          </h3>
          <MyRichEditor
            value={newContent}
            onChange={setNewContent}
            className="bg-dark-800 text-white border-dark-600"
          />
          {createError && (
            <Alert variant="destructive" className="mt-4 bg-dark-800 border-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreatePost}
              disabled={creatingPost || !newContent.trim()}
              className={`
                px-6 py-2 rounded-lg text-white font-medium
                ${
                  creatingPost || !newContent.trim()
                    ? "bg-dark-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }
                transition-colors
              `}
            >
              {creatingPost ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Post reply"
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Success message */}
      {successMsg && (
        <Alert className="bg-green-50 text-green-700 border-green-200">
          <Check className="h-4 w-4" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Report Thread</CardTitle>
            </CardHeader>
            <CardContent>
              {reportSuccess ? (
                <Alert className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertDescription>Report submitted successfully</AlertDescription>
                </Alert>
              ) : (
                <>
                  {reportError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{reportError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Reason for reporting
                      </label>
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={4}
                        placeholder="Please describe why you are reporting this thread..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        disabled={reportLoading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReportThread}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={reportLoading}
                      >
                        {reportLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Submit Report"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
