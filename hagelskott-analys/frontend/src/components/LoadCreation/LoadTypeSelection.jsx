/**
 * LoadTypeSelection
 * ================
 * Shows different types of loads that can be created.
 * Fetches a list of load types from backend.
 * 
 * When the user clicks a card, we navigate to the correct route
 * for creating that type of load.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Target, Crosshair, CircleDot } from "lucide-react";

// Example load types (in a real app, fetch from backend)
const LOAD_TYPES = [
  {
    id: "shotshell",
    title: "Shotgun Load",
    description: "Create shotshell loads for hunting and sport shooting",
    icon: Target,
    route: "/load-creation/shotgun",
  },
  {
    id: "rifle",
    title: "Rifle Load",
    description: "Create precise and powerful rifle loads",
    icon: Crosshair,
    route: "/load-creation/bullet",
    disabled: true, // Example: not implemented yet
  },
  {
    id: "pistol",
    title: "Pistol Load",
    description: "Create pistol loads for competition and practice",
    icon: CircleDot,
    route: "/load-creation/pistol",
    disabled: true,
  },
];

export default function LoadTypeSelection() {
  const navigate = useNavigate();

  // Example: loading state if fetching from backend
  const [loading] = React.useState(false);

  /**
   * When the user clicks a card,
   * navigate to the correct route for that load type.
   */
  const handleLoadTypeClick = (loadType) => {
    if (loadType.disabled) {
      alert("This load type is not yet available.");
      return;
    }
    navigate(loadType.route);
  };

  // Show a simple spinner/screen if loading data
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <p className="mt-4 text-gray-600">Loading load types...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4">
          Create New Load
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
          Design and customize your own loads with precise control over components and specifications.
        </p>
      </div>

      {/* Grid of load type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {LOAD_TYPES.map((loadType) => (
          <Card 
            key={loadType.id}
            onClick={() => handleLoadTypeClick(loadType)}
            className={`cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
              loadType.disabled 
                ? 'opacity-50 hover:opacity-60' 
                : 'hover:border-green-500'
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {loadType.icon && React.createElement(loadType.icon, {
                  className: "w-6 h-6 text-green-600"
                })}
                <CardTitle className="text-xl">{loadType.title}</CardTitle>
              </div>
              <CardDescription className="text-gray-700 dark:text-gray-300 text-base">
                {loadType.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {loadType.id === "shotshell" && "Perfect for clay shooting, hunting, and other shotgun activities."}
                {loadType.id === "rifle" && "Suitable for precision shooting, hunting, and target practice."}
                {loadType.id === "pistol" && "Ideal for competition shooting and practice sessions."}
              </p>
              {loadType.disabled && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Coming soon - This load type is not yet available
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
