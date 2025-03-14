import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Edit, Trash2, ArrowLeft } from "lucide-react";
import axios from "axios";

/**
 * ComponentDetails
 * =================
 * Visar detaljer om en enskild komponent (typ, tillverkare, egenskaper, etc.)
 */
const ComponentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Du kanske har en global konfiguration för axios
  // ex. axios.defaults.baseURL = "http://localhost:8000"
  // Annars prefixa "/api/components" med full url
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchComponent = async () => {
      try {
        setLoading(true);
        setError(null);

        // T.ex:
        // const response = await axios.get(`http://localhost:8000/api/components/${id}`, {
        const response = await axios.get(`/api/components/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // Kolla om du får "response.data" eller "response.data.data"
        setComponent(response.data); // Använd response.data direkt om backend returnerar { ...componentData }
      } catch (err) {
        setError("Kunde inte hämta komponentdata. Försök igen senare.");
      } finally {
        setLoading(false);
      }
    };

    fetchComponent();
  }, [id, token]);

  const handleDelete = async () => {
    if (!window.confirm("Är du säker på att du vill ta bort denna komponent?")) return;
    try {
      // DELETE
      await axios.delete(`/api/components/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate("/components");
    } catch (err) {
      setError("Kunde inte ta bort komponenten.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
        <span className="ml-2 text-gray-500">Laddar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center mt-10 text-center">
        <p className="text-red-500 font-semibold mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Gå tillbaka
        </button>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="flex flex-col items-center mt-10 text-center">
        <p className="text-gray-500 font-semibold">Ingen komponent hittades.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 mt-4 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Gå tillbaka
        </button>
      </div>
    );
  }

  // Sista render
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded mt-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center mb-6 text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tillbaka
      </button>

      <h1 className="text-2xl font-bold mb-4 text-gray-800">{component.name}</h1>

      <div className="space-y-2 text-gray-700">
        <p>
          <strong>Typ:</strong> {component.type}
        </p>
        <p>
          <strong>Tillverkare:</strong>{" "}
          {component.manufacturer || "Ingen tillverkare angiven"}
        </p>
        <p>
          <strong>Beskrivning:</strong>{" "}
          {component.description || "Ingen beskrivning tillgänglig"}
        </p>
        <p>
          <strong>Kaliber:</strong> {component.caliber || "Ingen kaliber angiven"}
        </p>
      </div>

      {component.properties && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Egenskaper:</h2>
          <ul className="list-disc list-inside text-gray-700">
            {Object.entries(component.properties).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {component.image?.url && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Produktbild:</h2>
          <img
            src={component.image.url}
            alt={component.name}
            className="w-full max-w-sm rounded shadow"
          />
        </div>
      )}

      <div className="flex gap-4 mt-8">
        <button
          onClick={() => navigate(`/components/edit/${component._id}`)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Redigera
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Ta bort
        </button>
      </div>
    </div>
  );
};

export default ComponentDetails;
