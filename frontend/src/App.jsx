import React, { useState } from 'react'
// Restoring axios for actual API calls
import axios from 'axios'

// --- Helper Components for Icons ---
// Using inline SVGs for icons to keep it self-contained and performant.
const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
)

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 mr-2 text-sky-300"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)

const ShieldAlertIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 mr-2 text-rose-300"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="M12 8v4"></path>
    <path d="M12 16h.01"></path>
  </svg>
)

const SparklesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 mr-2 text-yellow-300"
  >
    <path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9L12 18l1.9-5.8 5.8-1.9-5.8-1.9z" />
  </svg>
)

const MapPinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 mr-2 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
)

// --- Main App Component ---
export default function App() {
  // A slightly expanded list of cities for more options.
  const cities = [
    'San Francisco',
    'San Jose',
    'Oakland',
    'Palo Alto',
    'Mountain View',
    'Santa Clara',
    'Fremont',
    'Berkeley',
    'Sunnyvale',
    'Milpitas',
    'Cupertino',
    'Daly City',
  ]

  // State management
  const [source, setSource] = useState('San Francisco')
  const [destination, setDestination] = useState('San Jose')
  const [routes, setRoutes] = useState([])
  const [mapReady, setMapReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // --- Restored API call logic ---
  const handleBuildGraph = async () => {
    if (!source || !destination || source === destination) {
      // Simple validation to prevent unnecessary API calls
      console.warn('Source and destination must be selected and different.')
      return
    }
    setLoading(true)
    setShowResults(false)
    setRoutes([])
    setMapReady(false)

    try {
      // Original axios call to build the graph
      const res = await axios.post('/build-graph', { source, destination })
      const newRoutes = res.data.routes || []

      // To handle the edge case, we need to find the safest route by risk score
      // The fastest is already determined by sorting by duration
      const sortedByDuration = [...newRoutes].sort(
        (a, b) => a.duration_sec - b.duration_sec
      )
      const sortedByRisk = [...newRoutes].sort(
        (a, b) => a.risk_score - b.risk_score
      )

      // Add flags to each route object
      const processedRoutes = sortedByDuration.map((route, idx) => {
        const isFastest = idx === 0
        const isSafest = route === sortedByRisk[0]
        return { ...route, isFastest, isSafest }
      })

      setRoutes(processedRoutes)

      // Original axios call to generate the map if routes are found
      if (processedRoutes.length > 0) {
        await axios.post('/generate-map', {
          route1: processedRoutes[0].best_path,
          route2: processedRoutes[1]?.best_path || [],
        })
        setMapReady(true)
      }
    } catch (err) {
      console.error('Error building graph or generating map:', err)
      setMapReady(false) // Ensure map isn't shown on error
    } finally {
      setLoading(false)
      setShowResults(true) // Trigger the fade-in animation for results
    }
  }

  const getRouteCardStyle = (route) => {
    if (route.isFastest && route.isSafest) {
      return {
        borderColor: 'border-green-500/60',
        shadowColor: 'shadow-green-500/20',
        label: 'Fastest & Safest',
        labelColor: 'text-green-400',
      }
    }
    if (route.isFastest) {
      return {
        borderColor: 'border-rose-500/50',
        shadowColor: 'shadow-rose-500/20',
        label: 'Fast Route',
        labelColor: 'text-rose-400',
      }
    }
    if (route.isSafest) {
      return {
        borderColor: 'border-sky-500/50',
        shadowColor: 'shadow-sky-500/20',
        label: 'Safe Route',
        labelColor: 'text-sky-400',
      }
    }
    return {
      borderColor: 'border-slate-600/50',
      shadowColor: 'shadow-slate-500/20',
      label: 'Alternative Route',
      labelColor: 'text-slate-400',
    }
  }

  return (
    // --- Main container with gradient background ---
    <div className="min-h-screen w-full bg-slate-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-fuchsia-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* --- Header Section --- */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-sky-400 mb-4">
            NaviGaze
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            <i>Every journey has options. NaviGaze analyzes real-time data to rank
            your routes by both speed and safety. Choose{' '}
            <span className="text-rose-400 font-semibold">Fast</span> or{' '}
            <span className="text-sky-400 font-semibold">Safe</span> and travel
            with insight.</i>
          </p>
        </header>

        {/* --- Form Section with Glassmorphism Effect --- */}
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/20 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Source Dropdown */}
            <div className="relative">
              <label className="absolute -top-2.5 left-4 text-xs text-slate-400 bg-slate-800 px-1 z-10">
                From
              </label>
              <MapPinIcon />
              <select
                className="relative w-full pl-10 pr-4 py-3 bg-transparent border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {cities.map((city) => (
                  <option
                    className="bg-slate-800 text-white"
                    key={`src-${city}`}
                    value={city}
                  >
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Dropdown */}
            <div className="relative">
              <label className="absolute -top-2.5 left-4 text-xs text-slate-400 bg-slate-800 px-1 z-10">
                To
              </label>
              <MapPinIcon />
              <select
                className="relative w-full pl-10 pr-4 py-3 bg-transparent border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {cities.map((city) => (
                  <option
                    className="bg-slate-800 text-white"
                    key={`dest-${city}`}
                    value={city}
                  >
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* --- Submit Button --- */}
            <button
              onClick={handleBuildGraph}
              disabled={loading}
              className="w-full col-span-1 md:col-span-1 flex items-center justify-center gap-2 p-3 text-white font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-600/30 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <ArrowRightIcon />
                  Find Routes
                </>
              )}
            </button>
          </div>
        </div>

        {/* --- Results Section --- */}
        {showResults && (
          <div
            className={`transition-opacity duration-700 ease-in-out ${
              showResults ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {routes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {routes.map((route, idx) => {
                  const style = getRouteCardStyle(route)
                  return (
                    <div
                      key={idx}
                      className={`bg-slate-800/50 backdrop-blur-lg border ${style.borderColor} rounded-xl p-6 shadow-lg ${style.shadowColor} transition-all hover:border-white/50 hover:scale-[1.02]`}
                    >
                      <h2 className="text-xl font-bold mb-4 flex items-center">
                        {route.isFastest && route.isSafest && <SparklesIcon />}
                        <span className={style.labelColor}>{style.label}</span>
                      </h2>
                      <div className="space-y-3 text-slate-300">
                        <p className="flex items-center">
                          <ClockIcon />
                          Duration:{' '}
                          <span className="font-mono ml-2 text-white">
                            {(route.duration_sec / 60).toFixed(0)} mins
                          </span>
                        </p>
                        <p className="flex items-center">
                          <ShieldAlertIcon />
                          Risk Score:{' '}
                          <span className="font-mono ml-2 text-white">
                            {route.risk_score}
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* --- Map Section --- */}
            {mapReady ? (
              <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl shadow-black/20 overflow-hidden">
                <h3 className="text-lg font-semibold text-center py-4 px-4 bg-slate-900/50 border-b border-slate-700">
                  Interactive Route Map
                </h3>
                <div className="w-full h-[400px] md:h-[500px] bg-slate-900">
                  <iframe
                    src={`/static/multi_route_visualized.html?t=${Date.now()}`}
                    width="100%"
                    height="100%"
                    className="border-none"
                    title="Route Map"
                  />
                </div>
              </div>
            ) : (
              !loading &&
              routes.length > 0 && (
                <div className="text-center text-slate-400">
                  Generating map visualization...
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
