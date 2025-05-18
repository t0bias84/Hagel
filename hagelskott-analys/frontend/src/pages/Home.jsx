import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";
import { Link } from "react-router-dom";
import { 
  Upload, 
  Database, 
  Target, 
  Activity,
  Plus,
  Clock,
  ChevronRight,
  BarChart3
} from "lucide-react";

const StatCard = ({ icon: Icon, title, value, description, trend }) => (
  <Card className="p-6 bg-dark-800 border-dark-700 hover:border-primary/50 transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <h3 className="text-2xl font-semibold mt-1 text-white">{value}</h3>
      </div>
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-6 h-6 text-primary" />
      </div>
    </div>
    <p className="text-sm text-gray-400 mt-2">{description}</p>
    {trend && (
      <div className="flex items-center mt-2">
        <Activity className="w-4 h-4 text-green-500 mr-1" />
        <span className="text-sm text-green-500">{trend}</span>
      </div>
    )}
  </Card>
);

const QuickAction = ({ icon: Icon, title, description, to }) => (
  <Link to={to} className="block">
    <Card className="p-6 bg-dark-800 border-dark-700 hover:border-primary/50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </Card>
  </Link>
);

const RecentLoadCard = ({ load }) => (
  <Card className="p-4 bg-dark-800 border-dark-700 hover:border-primary/50 transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Database className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-white">{load.name}</h4>
          <p className="text-sm text-gray-400">{load.description}</p>
        </div>
      </div>
      <div className="flex items-center text-sm text-gray-400">
        <Clock className="w-4 h-4 mr-1" />
        {new Date(load.createdAt).toLocaleDateString()}
      </div>
    </div>
  </Card>
);

const Home = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = language === 'en' ? en : sv;
  const [recentLoads, setRecentLoads] = useState([]);
  const [stats, setStats] = useState({
    totalLoads: 0,
    activeComponents: 0,
    accuracy: 0
  });

  useEffect(() => {
    // Hämta senaste laddningar
    fetch('http://localhost:8000/api/loads/?sort=-createdAt&limit=5', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => setRecentLoads(data))
      .catch(err => console.error('Error fetching recent loads:', err));

    // Simulerad statistik (ersätt med faktisk data senare)
    setStats({
      totalLoads: 128,
      activeComponents: 45,
      accuracy: 97.5
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t.common.welcome}, {user?.username}!
          </h1>
          <p className="text-gray-400 mt-1">
            {t.dashboard.overview}
          </p>
        </div>
        <Link
          to="/upload"
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t.upload.newLoad}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Database}
          title={t.dashboard.totalLoads}
          value={stats.totalLoads}
          description={t.dashboard.loadsDescription}
          trend="+12% från förra månaden"
        />
        <StatCard
          icon={Target}
          title={t.dashboard.activeComponents}
          value={stats.activeComponents}
          description={t.dashboard.componentsDescription}
        />
        <StatCard
          icon={BarChart3}
          title={t.dashboard.accuracy}
          value={`${stats.accuracy}%`}
          description={t.dashboard.accuracyDescription}
          trend="Stabil precision"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            {t.dashboard.quickActions}
          </h2>
          <div className="space-y-4">
            <QuickAction
              icon={Upload}
              title={t.dashboard.newLoad}
              description={t.dashboard.newLoadDesc}
              to="/upload"
            />
            <QuickAction
              icon={Database}
              title={t.dashboard.viewLoads}
              description={t.dashboard.viewLoadsDesc}
              to="/loads"
            />
            <QuickAction
              icon={Target}
              title={t.dashboard.components}
              description={t.dashboard.componentsDesc}
              to="/components"
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            {t.dashboard.recentLoads}
          </h2>
          <div className="space-y-4">
            {recentLoads.map((load, index) => (
              <RecentLoadCard key={load._id || index} load={load} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 