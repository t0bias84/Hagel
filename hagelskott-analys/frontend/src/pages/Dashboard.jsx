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

/**
 * Hjälpfunktion för att göra API-anrop med token
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Ingen token i localStorage.");

  const url = `${import.meta.env.VITE_API_URL}${endpoint}`;
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    throw new Error(`Fel vid fetch: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export default function Dashboard() {
  const navigate = useNavigate();

  // ---------- States ----------
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [recentForumPosts, setRecentForumPosts] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);
  const [myLoadsStats, setMyLoadsStats] = useState({ loadCount: 0, totalViews: 0 });

  // Nya states för “heta diskussioner” & “mest gillade/hatade”
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
    "Glad att du loggat in, #. Du imponerar varje dag!",
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
        // Byt ut endpoint till vad du faktiskt använder
        const stats = await fetchWithAuth("/api/loads/mine/stats");
        setMyLoadsStats({
          loadCount: stats.loadCount || 0,
          totalViews: stats.totalViews || 0,
        });
      } catch (err) {
        console.error("Error fetching my loads stats:", err);
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
        // Exempel: Du kan ha olika endpoints:
        //   /api/forum/hot   -> top 10 (sorterat på popularitet)
        //   /api/forum/mostliked?week=true
        //   /api/forum/mostdisliked?week=true
        const [hot, liked, disliked] = await Promise.all([
          fetchWithAuth("/api/forum/hot"),
          fetchWithAuth("/api/forum/mostliked?week=true"),
          fetchWithAuth("/api/forum/mostdisliked?week=true"),
        ]);

        setTopDiscussions(hot);           // antas ge en array med top 10
        setMostLikedPost(liked || null);  // antas ge ett inlägg
        setMostDislikedPost(disliked || null);
      } catch (error) {
        console.error("Error fetching hot/liked/disliked:", error);
      } finally {
        setIsLoadingHot(false);
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
  const greetingText = randomGreeting.replace("#", user?.name || "Kära Användare");

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ---------- TOPBAR ---------- */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">
          {isLoadingUser ? "Laddar..." : greetingText}
        </h1>

        <div className="flex items-center gap-4">
          {/* Notisknapp */}
          <div className="relative">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bell className="h-5 w-5 text-gray-700" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          {/* Userinfo */}
          {!isLoadingUser && user && (
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || "/api/placeholder/32/32"}
                alt="User avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-700">
                  {user.name || "Okänd"}
                </p>
                <p className="text-xs text-gray-400">
                  {user.role || "Användare"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-full"
                aria-label="Logga ut"
              >
                <LogOut className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- MAIN CONTENT ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ----- Vänster+Mitten 2 spalter ----- */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stat Cards-rad */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Totala analyser */}
            <Card>
              <CardContent className="pt-5 pb-6 px-4">
                {isLoadingActivity ? (
                  <p>Laddar...</p>
                ) : (
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Totala analyser</p>
                      <p className="text-2xl font-semibold text-gray-800">
                        {recentActivity?.totalAnalyses ?? 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Snittresultat */}
            <Card>
              <CardContent className="pt-5 pb-6 px-4">
                {isLoadingActivity ? (
                  <p>Laddar...</p>
                ) : (
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CrosshairIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Snittresultat</p>
                      <p className="text-2xl font-semibold text-gray-800">
                        {recentActivity?.averageAccuracy ?? 0}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mina laddningar */}
            <Card>
              <CardContent className="pt-5 pb-6 px-4">
                {isLoadingMyLoads ? (
                  <p>Laddar...</p>
                ) : (
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Flame className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Mina laddningar</p>
                      <p className="text-2xl font-semibold text-gray-800">
                        {myLoadsStats.loadCount}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totala visningar */}
            <Card>
              <CardContent className="pt-5 pb-6 px-4">
                {isLoadingMyLoads ? (
                  <p>Laddar...</p>
                ) : (
                  <div className="flex items-center">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <UserPlus className="h-6 w-6 text-pink-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Totala visningar</p>
                      <p className="text-2xl font-semibold text-gray-800">
                        {myLoadsStats.totalViews}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Linjediagram (aktivitet) */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitetsöversikt</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <p>Laddar diagram...</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentActivity?.timeline || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="shots"
                        stroke="#3b82f6"
                        name="Antal skott"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#10b981"
                        name="Träffsäkerhet"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ----- Höger spalt ----- */}
        <div className="space-y-6">

          {/* Notifikationer */}
          <Card>
            <CardHeader>
              <CardTitle>Notifikationer</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingNotifications ? (
                <p className="text-sm text-gray-500">Laddar notifikationer...</p>
              ) : notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`
                        p-3 rounded-md
                        ${notif.read ? "bg-gray-50" : "bg-blue-50"}
                      `}
                    >
                      <p className="text-sm font-medium text-gray-700">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notif.createdAt}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Inga notifikationer</p>
              )}
            </CardContent>
          </Card>

          {/* Senaste forum-inlägg */}
          <Card>
            <CardHeader>
              <CardTitle>Senaste inlägg</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingForum ? (
                <p className="text-sm text-gray-500">Laddar forum-inlägg...</p>
              ) : recentForumPosts.length > 0 ? (
                <div className="space-y-3">
                  {recentForumPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/forum/post/${post.id}`)}
                      className="
                        cursor-pointer border-b border-gray-100
                        pb-2 last:border-none last:pb-0
                      "
                    >
                      <p className="font-medium text-gray-700 hover:text-blue-600">
                        {post.title}
                      </p>
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-gray-500">av {post.author}</p>
                        <p className="text-xs text-gray-400">{post.createdAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Inga foruminlägg</p>
              )}
            </CardContent>
          </Card>

          {/* Heta diskussioner (Topp 10) */}
          <Card>
            <CardHeader>
              <CardTitle>Hetaste diskussioner</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHot ? (
                <p className="text-sm text-gray-500">Laddar heta diskussioner...</p>
              ) : topDiscussions.length > 0 ? (
                <div className="space-y-3">
                  {topDiscussions.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => navigate(`/forum/threads/${thread.id}`)}
                      className="
                        cursor-pointer border-b border-gray-100
                        pb-2 last:border-none last:pb-0
                      "
                    >
                      <p className="font-medium text-gray-700 hover:text-blue-600">
                        {thread.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {thread.postCount} inlägg • {thread.likeCount} gillningar
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Inga heta diskussioner</p>
              )}
            </CardContent>
          </Card>

          {/* Mest gillade / mest hatade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Mest gillat (veckan)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHot ? (
                  <p className="text-sm text-gray-500">Laddar...</p>
                ) : mostLikedPost ? (
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/forum/post/${mostLikedPost.id}`)}
                  >
                    <p className="font-medium text-gray-700 hover:text-blue-600">
                      {mostLikedPost.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {mostLikedPost.likeCount} gillningar • av {mostLikedPost.author}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Ingen data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mest hatat (veckan)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHot ? (
                  <p className="text-sm text-gray-500">Laddar...</p>
                ) : mostDislikedPost ? (
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/forum/post/${mostDislikedPost.id}`)}
                  >
                    <p className="font-medium text-gray-700 hover:text-blue-600">
                      {mostDislikedPost.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {mostDislikedPost.dislikeCount} “ogillar” • av {mostDislikedPost.author}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Ingen data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
