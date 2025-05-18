import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Save, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function EditLoadPage() {
  const { id } = useParams(); // Get load ID from URL
  const navigate = useNavigate();

  // State for loading, error, success etc.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load data
  const [loadData, setLoadData] = useState({
    name: "",
    purpose: "",
    type: "Shotgun",
    caliber: "12",
    shellLength: "70",
    components: [],
  });

  // 1) Fetch load data based on ID (mocked fetch)
  useEffect(() => {
    const fetchLoad = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mocked API call, replace with real:
        //   const response = await fetch(`/api/loads/${id}`);
        //   const data = await response.json();
        //   if (!response.ok) throw new Error("Could not fetch the load.");

        // Simulated delay and mock data
        const response = await new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              data: {
                id,
                name: "Test load #1",
                purpose: "Dove hunting",
                type: "Shotgun",
                caliber: "12",
                shellLength: "70",
                components: [
                  { name: "Powder", amount: "1.5g" },
                  { name: "Wad", amount: "Standard" },
                  { name: "Shot", amount: "28g" },
                ],
              },
            });
          }, 1000)
        );

        if (!response.ok) {
          throw new Error("Could not fetch the load.");
        }
        setLoadData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLoad();
  }, [id]);

  // 2) Handle input changes (text fields etc.)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoadData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 3) Handle save/update load (mock)
  const handleSave = async () => {
    try {
      setLoading(true);
      setSuccessMsg(null);
      setError(null);

      // Mock of API call:
      //   const response = await fetch(`/api/loads/${id}`, {
      //     method: "PUT",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify(loadData),
      //   });
      //   if (!response.ok) throw new Error("Could not save changes.");

      // Simulated delay
      const response = await new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true }), 1000)
      );

      if (!response.ok) {
        throw new Error("Could not save changes.");
      }

      // If successful
      setSuccessMsg("Load has been updated!");
      setLoading(false);

      // Navigate back to the load list or wherever you want:
      navigate("/loads");

    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while saving.");
      setLoading(false);
    }
  };

  // 4) Handle back button
  const handleBack = () => {
    navigate(-1);
  };

  // -------------- Render --------------

  // Loading state
  if (loading && !loadData.name && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-lg font-medium text-gray-600">Loading load...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 p-4 border border-red-200 bg-red-50 rounded-md">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">An error occurred</p>
        </div>
        <p className="text-sm text-red-700">{error}</p>

        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold">Edit Load</h1>
      </div>

      {/* Success message if saving succeeds */}
      {successMsg && (
        <div className="mb-4 flex items-center space-x-2 border border-green-200 bg-green-50 text-green-700 rounded-md p-3">
          <CheckCircle2 className="h-5 w-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4 bg-white shadow-md rounded-md p-4">
        {/* Name */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="name">
            Name of the load:
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={loadData.name || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
            placeholder="Ex: Test load #1"
          />
        </div>

        {/* Purpose */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Purpose
          </label>
          <input
            type="text"
            value={loadData.purpose || ""}
            onChange={(e) => setLoadData((prev) => ({ ...prev, purpose: e.target.value }))}
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type (ev. dropdown) */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="type">
            Type of load:
          </label>
          <input
            id="type"
            type="text"
            name="type"
            value={loadData.type || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
          />
          {/* Example: you can make this a <select> if you want. */}
        </div>

        {/* Caliber */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="caliber">
            Caliber:
          </label>
          <input
            id="caliber"
            type="text"
            name="caliber"
            value={loadData.caliber || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
          />
        </div>

        {/* Shell length */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="shellLength">
            Shell length:
          </label>
          <input
            id="shellLength"
            type="text"
            name="shellLength"
            value={loadData.shellLength || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
          />
        </div>

        {/* Component list? (if you want a repeatable section) */}
        {/* Example: loadData.components, you can map over them etc. */}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
