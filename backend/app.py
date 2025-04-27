from flask import Flask, request, jsonify
import openrouteservice
import networkx as nx
from geopy.distance import geodesic
from flask_cors import CORS
import matplotlib
matplotlib.use('Agg') 
import matplotlib.pyplot as plt
from flask import send_from_directory
import os
import folium
import re
import json

# First, let's load our JSON containing risk data(usually from an API response)
with open('llm_output/ranked_coords_list3.json', 'r') as f:
    risk_data = json.load(f)

# Build a lookup dictionary for quick access
risk_lookup = {}
for entry in risk_data:
    key = (round(entry["lat"], 3), round(entry["lon"], 3))  # rounding to 3 decimals for matching
    risk_lookup[key] = entry["adjusted_score"]


app = Flask(__name__, static_url_path="/static", static_folder="static")
CORS(app)

client = openrouteservice.Client(key="5b3ce3597851110001cf6248ac3c4ef3926648e28cbbfda122d13aa0")

city_coords = {
    "San Francisco": [-122.4194, 37.7749],
    "Los Angeles": [-118.2437, 34.0522],
    "San Jose": [-121.8863, 37.3382],
    "Sacramento": [-121.4944, 38.5816],
}
def visualize_two_routes_from_strings(route1_str, route2_str, output_file='static/multi_route_visualized.html'):
    def parse_coordinates(route_str):
        matches = re.findall(r'\(([-\d.]+), ([-\d.]+)\)', route_str)
        return [(float(lat), float(lon)) for lat, lon in matches]

    route1 = parse_coordinates(route1_str)
    route2 = parse_coordinates(route2_str)

    if not route1 and not route2:
        print("No coordinates found!")
        return

    center = route1[0] if route1 else route2[0]
    route_map = folium.Map(location=center, zoom_start=13)

    if route1:
        folium.PolyLine(route1, color='red', weight=4, opacity=0.7, tooltip='Route 1').add_to(route_map)
        folium.Marker(route1[0], tooltip='Route 1 Start', icon=folium.Icon(color='green')).add_to(route_map)
        folium.Marker(route1[-1], tooltip='Route 1 End', icon=folium.Icon(color='red')).add_to(route_map)

    if route2:
        folium.PolyLine(route2, color='blue', weight=4, opacity=0.7, tooltip='Route 2').add_to(route_map)
        folium.Marker(route2[0], tooltip='Route 2 Start', icon=folium.Icon(color='green')).add_to(route_map)
        folium.Marker(route2[-1], tooltip='Route 2 End', icon=folium.Icon(color='red')).add_to(route_map)

    route_map.save(output_file)
@app.route('/images/<filename>')
def serve_image(filename):
    return send_from_directory(os.path.abspath('.'), filename)

@app.route("/build-graph", methods=["POST"])
def build_graph():
    try:
        data = request.json
        source = city_coords[data['source']]
        destination = city_coords[data['destination']]

        def draw_graph(G, best_path=None, filename="graph_output.png", route_id=1):
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            import networkx as nx
            import os

            pos = {node: (node[1], node[0]) for node in G.nodes()}  # lon, lat

            fig, ax = plt.subplots(figsize=(12, 8))

            nx.draw_networkx_edges(G, pos, ax=ax, edge_color="lightgray", width=0.8)
            nx.draw_networkx_nodes(G, pos, ax=ax, node_size=3, node_color="gray")

            if best_path and len(best_path) > 1:
                path_edges = list(zip(best_path, best_path[1:]))
                nx.draw_networkx_edges(G, pos, edgelist=path_edges, edge_color="red", width=3, ax=ax)
                nx.draw_networkx_nodes(G, pos, nodelist=best_path, node_color="red", node_size=20, ax=ax)
                nx.draw_networkx_nodes(G, pos, nodelist=[best_path[0]], node_color="green", node_size=50, ax=ax, label="Start")
                nx.draw_networkx_nodes(G, pos, nodelist=[best_path[-1]], node_color="blue", node_size=50, ax=ax, label="End")

            ax.set_title("Route Graph with A* Best Path", fontsize=14)
            plt.axis("off")
            plt.tight_layout()

            # ✅ Ensure 'static/' folder exists
            os.makedirs("static", exist_ok=True)
            static_path = os.path.join("static", f"graph_route_{route_id}.png")
            plt.savefig(static_path, bbox_inches="tight")
            plt.close(fig)
            print(f"✅ Graph saved to {static_path}")



        response = client.directions(
            coordinates=[source, destination],
            profile="driving-car",
            format="geojson",
            instructions=True,
            alternative_routes={
                "target_count": 2,
                "share_factor": 0.1,
                "weight_factor": 2.5
            }
        )

        routes = response['features']
        results = []

        def get_risk(coord):
            lat, lon = coord
            key = (round(lat, 3), round(lon, 3))  # match at 3 decimals
            if key in risk_lookup:
                return risk_lookup[key]
            else:
                return 5  # fallback medium risk if not found

        for idx, feature in enumerate(routes):
            coords = feature['geometry']['coordinates']
            latlon_coords = [(lat, lon) for lon, lat in coords]

            G = nx.DiGraph()
            for i in range(len(latlon_coords) - 1):
                u = tuple(latlon_coords[i])
                v = tuple(latlon_coords[i + 1])
                dist_km = geodesic(u, v).km
                duration = dist_km * 60  # estimate 60km/h
                risk = get_risk(u) + get_risk(v)
                G.add_edge(u, v, distance=round(dist_km, 2), duration=round(duration, 2),
                        risk_weight=round(duration + risk * 100, 2))

            source_node = tuple(latlon_coords[0])
            target_node = tuple(latlon_coords[-1])

            try:
                safest_path = nx.astar_path(G, source_node, target_node, weight="risk_weight")
            except:
                safest_path = [source_node, target_node]

            def route_stats(path, G):
                total_duration = sum(G[u][v]['duration'] for u, v in zip(path, path[1:]))
                total_risk = sum(G[u][v]['risk_weight'] for u, v in zip(path, path[1:]))
                return round(total_duration, 2), round(total_risk, 2)

            dur, risk = route_stats(safest_path, G)
            filename = f"graph_route_{idx+1}.png"
            draw_graph(G, best_path=safest_path, filename=filename, route_id=idx + 1)

            results.append({
                "route_id": idx + 1,
                "duration_sec": dur,
                "risk_score": risk,
                "best_path": safest_path
            })

        return jsonify({"routes": results})

    except Exception as e:
        print("Error building graph:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/generate-map", methods=["POST"])
def generate_map():
    data = request.json
    route1 = data.get("route1", [])
    route2 = data.get("route2", [])

    def route_to_string(route):
        return " → ".join(f"({round(pt[0], 6)}, {round(pt[1], 6)})" for pt in route)

    route1_str = route_to_string(route1)
    route2_str = route_to_string(route2)

    output_file = "static/multi_route_visualized.html"
    visualize_two_routes_from_strings(route1_str, route2_str, output_file=output_file)

    return jsonify({"map_url": f"/{output_file}"})

if __name__ == "__main__":
    app.run(debug=True)
