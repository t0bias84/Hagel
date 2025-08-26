import React, { useState, useEffect } from 'react';
import { Bell, Circle } from 'lucide-react';
import { getNotifications } from '@/services/notificationService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Link } from 'react-router-dom';

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  const { lastMessage } = useWebSocket();

  // Fetch initial notifications
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
        if (data.some(n => !n.read)) {
          setHasUnread(true);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };
    fetchInitialNotifications();
  }, []);

  // Handle incoming real-time notifications
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'notification') {
      const newNotification = lastMessage.data;
      // Add to the top of the list
      setNotifications(prev => [newNotification, ...prev]);
      setHasUnread(true);
    }
  }, [lastMessage]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
        // Mark notifications as read when dropdown is opened
        // In a real app, you'd also make an API call to update the backend
        setHasUnread(false);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-lg text-white hover:bg-dark-700">
        <Bell className="w-5 h-5" />
        {hasUnread && <Circle className="absolute top-1 right-1 w-3 h-3 text-red-500 fill-current" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-military-800 border border-military-700 rounded-lg shadow-lg z-20">
          <div className="p-4 font-semibold border-b border-military-700">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <Link to={`/loads/${notif.object_id}`} key={notif.id || notif._id} className="block p-4 border-b border-military-600 hover:bg-military-700">
                  <p className={`text-sm ${!notif.read ? 'font-bold' : ''}`}>{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                </Link>
              ))
            ) : (
              <p className="p-4 text-sm text-gray-400">No new notifications.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
