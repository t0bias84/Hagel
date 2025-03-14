import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

/**
 * CategoryList – moderniserad med Slack-liknande design och militärgrön accent
 *
 * @param {Array} categories [{ id, name, description, threadCount, postCount }, ...]
 */
const CategoryList = ({ categories }) => {
  const navigate = useNavigate();

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-300 mt-10">
        <p>Inga kategorier att visa för tillfället.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Card
          key={category.id}
          className="
            group relative
            cursor-pointer
            shadow-sm
            hover:shadow-md
            transition-shadow
            duration-200
            bg-white
            dark:bg-gray-800
            border
            border-gray-100
            dark:border-gray-700
            rounded-lg
          "
          onClick={() => navigate(`/forum/${category.id}`)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="mr-2 space-y-1">
                {/* Kategorins namn */}
                <h3 className="
                  text-base
                  font-semibold
                  text-gray-900
                  dark:text-gray-50
                  group-hover:text-green-700
                  dark:group-hover:text-green-300
                  transition-colors
                ">
                  {category.name}
                </h3>

                {/* Kategorins beskrivning */}
                <p className="
                  text-sm
                  text-gray-600
                  dark:text-gray-400
                  leading-snug
                ">
                  {category.description}
                </p>

                {/* Tråd- och inläggsinfo */}
                <div className="mt-3 flex items-center gap-4">
                  <span className="
                    text-xs
                    text-gray-500
                    dark:text-gray-400
                    bg-gray-100
                    dark:bg-gray-700
                    px-2
                    py-1
                    rounded-full
                  ">
                    {category.threadCount} trådar
                  </span>
                  <span className="
                    text-xs
                    text-gray-500
                    dark:text-gray-400
                    bg-gray-100
                    dark:bg-gray-700
                    px-2
                    py-1
                    rounded-full
                  ">
                    {category.postCount} inlägg
                  </span>
                </div>
              </div>

              {/* Pil-ikon */}
              <div className="
                flex items-center
                text-gray-300
                dark:text-gray-600
                group-hover:text-green-600
                dark:group-hover:text-green-300
                transition-colors
              ">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CategoryList;
