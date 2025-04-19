import React, { useState } from 'react';
import axios from 'axios';

const cities = ["San Francisco", "Los Angeles", "San Jose", "Sacramento"];

export default function App() {
  const [source, setSource] = useState("San Francisco");
  const [destination, setDestination] = useState("Los Angeles");
  const [routes, setRoutes] = useState([]);

  const handleBuildGraph = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:5000/build-graph", {
        source,
        destination,
      });
      setRoutes(res.data.routes || []);
    } catch (error) {
      console.error("Error building graph:", error);
      setRoutes([]);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Route Ranking App 🚦</h1>
      <div className="flex flex-col gap-4 mb-6">
        <select
          className="border p-2 rounded"
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
          className="border p-2 rounded"
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Build and Rank Route
        </button>
      </div>

      {routes.length > 0 && (
        <div className="flex flex-wrap gap-6 justify-center">
          {routes.map((route, idx) => (
            <div key={idx} className="flex-1 min-w-[320px] max-w-[48%] bg-gray-100 p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2 text-blue-700">
                Route {route.route_id}
              </h2>
              <p><strong>Duration:</strong> {route.duration_sec} sec</p>
              <p><strong>Risk Score:</strong> {route.risk_score}</p>
              <p className="text-sm mt-2 text-gray-700 break-all">
                <strong>Path:</strong>{" "}
                {route.best_path
                  .map((pt) =>
                    Array.isArray(pt)
                      ? `(${pt[0].toFixed(3)}, ${pt[1].toFixed(3)})`
                      : "?"
                  )
                  .join(" → ")}
              </p>
              <img
                src={`http://127.0.0.1:5000/images/graph_route_${route.route_id}.png`}
                alt={`Route ${route.route_id}`}
                className="mt-4 rounded shadow"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
