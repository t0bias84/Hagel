import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Target,
  CrosshairIcon,
  Bell,
  LogOut,
  Flame,
  UserPlus,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

/**
 * Hjälpfunktion för att göra API-anrop med token
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token in localStorage");

  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}${endpoint}`;
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      if (res.status === 404) {
        return null; // Returnera null för 404-fel
      }
      throw new Error(`Fetch error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  // ---------- States ----------
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [recentForumPosts, setRecentForumPosts] = useState([]);
  const [recentActivity, setRecentActivity] = useState({
    totalAnalyses: 0,
    averageAccuracy: 0,
    timeline: []
  });
  const [myLoadsStats, setMyLoadsStats] = useState({ loadCount: 0, totalViews: 0 });
  const [recentLoads, setRecentLoads] = useState([]);
  const [isLoadingRecentLoads, setIsLoadingRecentLoads] = useState(true);

  // Nya states för "heta diskussioner" & "mest gillade/hatade"
  const [topDiscussions, setTopDiscussions] = useState([]);
  const [mostLikedPost, setMostLikedPost] = useState(null);
  const [mostDislikedPost, setMostDislikedPost] = useState(null);

  // Loading states
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingForum, setIsLoadingForum] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingMyLoads, setIsLoadingMyLoads] = useState(true);
  const [isLoadingHot, setIsLoadingHot] = useState(true);

  // ~30 positiva hälsningsfraser
  const greetings = [
    "Välkommen, #! Du är grym!",
    "Hej #, du rockar!",
    "Hallå där, #! Fantastiskt att se dig!",
    "Äntligen är du här, # – du är bäst!",
    "Glad to see you logged in, #. You impress every day!",
    "Hallå #! Hoppas du har en underbar dag!",
    "Välkommen tillbaka, #! Dina laddningar är legend!",
    "Tjena #! Du gör världen lite bättre!",
    "Kul att du är här, # – fortsätt vara awesome!",
    "God dag, #! Du förtjänar en applåd!",
    "Morsning # – du är otrolig!",
    "Det skiner om dig idag, #!",
    "Du + detta system = succé, #!",
    "#, världen tackar dig för ditt engagemang!",
    "#, din energi smittar av sig!",
    "Ärade #, välkommen!",
    "Stora planer idag #? Du fixar dem galant!",
    "#, sikta högt och njut av resan!",
    "Du är en stjärna i allt du gör, #!",
    "#, vi är glada att ha dig här!",
    "Fortsätt dominera, #!",
    "Strålande form idag, #, eller hur?",
    "Go go go #! Du har detta!",
    "#, du är i toppform – fortsätt så!",
    "Snyggt jobbat #, du inspirerar oss!",
    "#, du förtjänar en medalj!",
    "Toppklass, #! Kör hårt!",
    "Vilken hjälte du är # – heja!",
    "#, du är exemplariskt grym!",
    "Fantastiska #, dags för nya äventyr!"
  ];
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  // ---------- 1) Hämta user ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingUser(true);
        const data = await fetchWithAuth("/api/user");
        setUser(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoadingUser(false);
      }
    })();
  }, []);

  // ---------- 2) Hämta notifikationer ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingNotifications(true);
        const data = await fetchWithAuth("/api/notifications");
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoadingNotifications(false);
      }
    })();
  }, []);

  // ---------- 3) Hämta senaste forum-inlägg ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingForum(true);
        const data = await fetchWithAuth("/api/forum/recent");
        setRecentForumPosts(data);
      } catch (error) {
        console.error("Error fetching forum posts:", error);
      } finally {
        setIsLoadingForum(false);
      }
    })();
  }, []);

  // ---------- 4) Hämta aktivitetsdata (statistik) ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActivity(true);
        const data = await fetchWithAuth("/api/activity");
        setRecentActivity(data);
      } catch (error) {
        console.error("Error fetching activity data:", error);
      } finally {
        setIsLoadingActivity(false);
      }
    })();
  }, []);

  // ---------- 5) Hämta info om mina laddningar ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingMyLoads(true);
        const stats = await fetchWithAuth("/api/loads/mine/stats");
        if (stats) {
          setMyLoadsStats({
            loadCount: stats.loadCount || 0,
            totalViews: stats.totalViews || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching my loads stats:", err);
        setMyLoadsStats({ loadCount: 0, totalViews: 0 });
      } finally {
        setIsLoadingMyLoads(false);
      }
    })();
  }, []);

  // ---------- 6) Hämta heta diskussioner, mest gillat & mest hatat ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingHot(true);
        const [hot, liked, disliked] = await Promise.all([
          fetchWithAuth("/api/forum/hot"),
          fetchWithAuth("/api/forum/mostliked?week=true"),
          fetchWithAuth("/api/forum/mostdisliked?week=true"),
        ]);

        setTopDiscussions(hot || []);
        setMostLikedPost(liked);
        setMostDislikedPost(disliked);
      } catch (error) {
        console.error("Error fetching hot/liked/disliked:", error);
        setTopDiscussions([]);
        setMostLikedPost(null);
        setMostDislikedPost(null);
      } finally {
        setIsLoadingHot(false);
      }
    })();
  }, []);

  // ---------- Hämta senaste laddningar ----------
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingRecentLoads(true);
        const data = await fetchWithAuth("/api/loads?sort=-createdAt&limit=5");
        setRecentLoads(data || []);
      } catch (error) {
        console.error("Error fetching recent loads:", error);
        setRecentLoads([]);
      } finally {
        setIsLoadingRecentLoads(false);
      }
    })();
  }, []);

  // ---------- Logga ut ----------
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetchWithAuth("/api/auth/logout", { method: "POST" });
      }
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  // Antal olästa notiser
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Hälsning med user-name insatt
  const greetingText = randomGreeting.replace("#", user?.name || t.common.welcome);

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50 p-6">
      {/* Välkomsthälsning */}
      <h1 className="text-2xl font-bold mb-8 text-dark-50">{greetingText}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Notifikationer */}
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-dark-50 font-bold">
                {t.dashboard.notifications.title}
                {unreadNotificationsCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-dark-accent text-dark-50">
                    {unreadNotificationsCount}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingNotifications ? (
                <p className="text-dark-200">{t.common.loading}</p>
              ) : notifications.length === 0 ? (
                <p className="text-dark-200">
                  {t.dashboard.notifications.empty}
                </p>
              ) : (
                <ul className="space-y-4">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`p-3 rounded-lg ${
                        notification.read
                          ? "bg-dark-700/50"
                          : "bg-dark-600"
                      }`}
                    >
                      <p className="text-sm text-dark-50">
                        {notification.message}
                      </p>
                      <p className="text-xs text-dark-200 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Senast publicerade laddningar */}
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader>
              <CardTitle className="text-dark-50">Senast publicerade laddningar</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRecentLoads ? (
                <p className="text-dark-200">{t.common.loading}</p>
              ) : recentLoads.length === 0 ? (
                <p className="text-dark-200">Inga laddningar att visa</p>
              ) : (
                <div className="space-y-4">
                  {recentLoads.map((load) => (
                    <div
                      key={load._id}
                      className="p-4 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
                      onClick={() => navigate(`/loads/${load._id}`)}
                    >
                      <h3 className="font-medium text-dark-50 hover:text-dark-accent">
                        {load.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-dark-300">
                        <span>Av {load.author?.username || 'Okänd'}</span>
                        <span>{load.views || 0} visningar</span>
                        <span>{new Date(load.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Senaste forum-inlägg */}
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader>
              <CardTitle className="text-dark-50">{t.dashboard.recentPosts}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingForum ? (
                <p className="text-dark-200">{t.common.loading}</p>
              ) : recentForumPosts.length === 0 ? (
                <p className="text-dark-200">{t.common?.noResults || 'No posts to show'}</p>
              ) : (
                <div className="space-y-4">
                  {recentForumPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
                      onClick={() => navigate(`/forum/post/${post.id}`)}
                    >
                      <h3 className="font-medium text-dark-50 hover:text-dark-accent">
                        {post.title}
                      </h3>
                      <p className="text-sm text-dark-200 mt-1">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-dark-300">
                        <span>{post.author}</span>
                        <span>{post.replies} svar</span>
                        <span>{post.views} visningar</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Heta diskussioner */}
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader>
              <CardTitle className="text-dark-50">{t.dashboard.hotDiscussions}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHot ? (
                <p className="text-dark-200">{t.common.loading}</p>
              ) : topDiscussions.length > 0 ? (
                <div className="space-y-4">
                  {topDiscussions.slice(0, 5).map((discussion) => (
                    <div
                      key={discussion.id}
                      className="p-3 bg-dark-700/50 rounded-lg hover:bg-dark-600 transition-colors cursor-pointer"
                      onClick={() => navigate(`/forum/post/${discussion.id}`)}
                    >
                      <h3 className="font-medium text-dark-50">
                        {discussion.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-dark-300">
                        <span>{discussion.replies} svar</span>
                        <span>{discussion.views} visningar</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dark-200">{t.common?.noResults || 'No liked posts'}</p>
              )}
            </CardContent>
          </Card>

          {/* Mest gillat/ogillat */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-dark-800 border-dark-700">
              <CardHeader>
                <CardTitle className="text-dark-50">Topp 5 mest gillade denna vecka</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHot ? (
                  <p className="text-dark-200">{t.common.loading}</p>
                ) : mostLikedPost ? (
                  <div className="space-y-3">
                    {mostLikedPost.slice(0, 5).map(post => (
                      <div
                        key={post.id}
                        className="cursor-pointer hover:bg-dark-600 p-3 rounded-lg transition-colors bg-dark-700/50"
                        onClick={() => navigate(`/forum/post/${post.id}`)}
                      >
                        <p className="font-medium text-dark-50">
                          {post.title}
                        </p>
                        <p className="text-xs text-dark-200 mt-1">
                          {post.likeCount} "gillar" • av {post.author}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-dark-200">{t.common?.noResults || 'No liked posts'}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-dark-800 border-dark-700">
              <CardHeader>
                <CardTitle className="text-dark-50">Topp 5 mest ogillade denna vecka</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHot ? (
                  <p className="text-dark-200">{t.common.loading}</p>
                ) : mostDislikedPost ? (
                  <div className="space-y-3">
                    {mostDislikedPost.slice(0, 5).map(post => (
                      <div
                        key={post.id}
                        className="cursor-pointer hover:bg-dark-600 p-3 rounded-lg transition-colors bg-dark-700/50"
                        onClick={() => navigate(`/forum/post/${post.id}`)}
                      >
                        <p className="font-medium text-dark-50">
                          {post.title}
                        </p>
                        <p className="text-xs text-dark-200 mt-1">
                          {post.dislikeCount} "ogillar" • av {post.author}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-dark-200">{t.common?.noResults || 'No disliked posts'}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
