import React, { useState } from 'react';
import axios from 'axios';

const cities = ["San Francisco", "Los Angeles", "San Jose", "Sacramento"];

export default function App() {
  const [source, setSource] = useState("San Francisco");
  const [destination, setDestination] = useState("Los Angeles");
  const [routes, setRoutes] = useState([]);
  const [mapReady, setMapReady] = useState(false);


  const handleBuildGraph = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:5000/build-graph", {
        source,
        destination,
      });
      const newRoutes = res.data.routes || [];
      setRoutes(newRoutes);
      setMapReady(false); // clear old state first

      if (newRoutes.length > 1) {
        // wait until the map is definitely created
        await axios.post("http://127.0.0.1:5000/generate-map", {
          route1: newRoutes[0].best_path,
          route2: newRoutes[1].best_path,
        });
        setMapReady(true);
      }

    } catch (err) {
      console.error("Error:", err);
      setMapReady(false);
    }
  };


  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-800">🛣️ NaviGaze</h1>

      {/* Form */}
      <div className="flex flex-col gap-4 mb-8">
        <select
          className="border p-2 rounded text-lg"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Select Source</option>
          {cities.map((city) => (
            <option key={`src-${city}`} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded text-lg"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="">Select Destination</option>
          {cities.map((city) => (
            <option key={`dest-${city}`} value={city}>
              {city}
            </option>
          ))}
        </select>

        <button
          onClick={handleBuildGraph}
          className="bg-blue-600 text-white px-4 py-3 rounded text-lg hover:bg-blue-700 transition"
        >
          🚀 Build and Rank Route
        </button>
      </div>

      {/* Route Cards */}
      {routes.length > 0 && (
        <div className="flex flex-wrap gap-6 justify-center">
          {routes.map((route, idx) => (
            <div
              key={idx}
              className="flex-1 min-w-[320px] max-w-[48%] bg-white p-6 rounded-2xl shadow-xl border border-gray-200 transition-transform hover:scale-[1.01]"
            >
              <h2 className="text-xl font-semibold mb-3 text-blue-700 flex items-center gap-2">
                {idx === 0 ? "🔴 Fast Route" : "🔵 Safe Route"}
              </h2>

              <div className="flex gap-4 mb-2">
                <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                  ⏱ Duration: {route.duration_sec} sec
                </span>
                <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                  ⚠️ Risk Score: {route.risk_score}
                </span>
              </div>
            </div>
          ))}

          {/* Combined Folium Map */}
          {routes.length > 1 && (
            <div className="w-full mt-10 border border-green-300 rounded-xl shadow-lg p-4 bg-green-50">
              <h2 className="text-xl font-bold text-green-700 mb-3">📍 Interactive Route Map</h2>
              {mapReady && (
                <iframe
                  src="http://127.0.0.1:5000/static/multi_route_visualized.html"
                  width="100%"
                  height="600"
                  className="rounded-md border border-gray-300"
                  title="Combined Route Map"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
