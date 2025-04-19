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

app = Flask(__name__, static_url_path="/static", static_folder="static")
CORS(app)

client = openrouteservice.Client(key="5b3ce3597851110001cf6248ac3c4ef3926648e28cbbfda122d13aa0")

city_coords = {
    "San Francisco": [-122.4194, 37.7749],
    "Los Angeles": [-118.2437, 34.0522],
    "San Jose": [-121.8863, 37.3382],
    "Sacramento": [-121.4944, 38.5816],
}

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

        def get_mock_risk(coord):
            lat, lon = coord
            if lat < 36.0:
                return 10  # high risk
            elif lat > 37.8:
                return 1   # low risk
            else:
                return 5   # medium risk

        for idx, feature in enumerate(routes):
            coords = feature['geometry']['coordinates']
            latlon_coords = [(lat, lon) for lon, lat in coords]

            G = nx.DiGraph()
            for i in range(len(latlon_coords) - 1):
                u = tuple(latlon_coords[i])
                v = tuple(latlon_coords[i + 1])
                dist_km = geodesic(u, v).km
                duration = dist_km * 60  # estimate 60km/h
                risk = get_mock_risk(u) + get_mock_risk(v)
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



        # coords = response['features'][0]['geometry']['coordinates']
        # steps = response['features'][0]['properties']['segments'][0]['steps']

        # latlon_coords = [(lat, lon) for lon, lat in coords]
        # durations = [step['duration'] for step in steps]

        # G = nx.DiGraph()
        # for i in range(len(latlon_coords) - 1):
        #     u = tuple(latlon_coords[i])
        #     v = tuple(latlon_coords[i + 1])
        #     duration = durations[i] if i < len(durations) else geodesic(u, v).km * 60
        #     dist_km = geodesic(u, v).km
        #     G.add_edge(u, v, distance=round(dist_km, 2), duration=round(duration, 2))

        # def draw_graph(G, best_path=None, filename="graph_output.png"):
        #     import matplotlib
        #     matplotlib.use('Agg')
        #     import matplotlib.pyplot as plt
        #     import networkx as nx

        #     pos = {node: (node[1], node[0]) for node in G.nodes()}  # lon, lat

        #     fig, ax = plt.subplots(figsize=(12, 8))

        #     # 🔹 All edges and nodes in light gray
        #     nx.draw_networkx_edges(G, pos, ax=ax, edge_color="lightgray", width=0.8)
        #     nx.draw_networkx_nodes(G, pos, ax=ax, node_size=3, node_color="gray")

        #     if best_path and len(best_path) > 1:
        #         # 🔸 Highlight best path edges
        #         path_edges = list(zip(best_path, best_path[1:]))
        #         nx.draw_networkx_edges(G, pos, edgelist=path_edges, edge_color="red", width=3, ax=ax)

        #         # 🔸 Best path nodes
        #         nx.draw_networkx_nodes(G, pos, nodelist=best_path, node_color="red", node_size=20, ax=ax)

        #         # 🟢 Start + 🔴 End nodes
        #         nx.draw_networkx_nodes(G, pos, nodelist=[best_path[0]], node_color="green", node_size=50, ax=ax, label="Start")
        #         nx.draw_networkx_nodes(G, pos, nodelist=[best_path[-1]], node_color="blue", node_size=50, ax=ax, label="End")

        #     ax.set_title("Route Graph with A* Best Path", fontsize=14)
        #     plt.axis("off")
        #     plt.tight_layout()
        #     plt.savefig(filename, bbox_inches="tight")
        #     plt.close(fig)
        #     print(f"✅ Graph saved to {filename}")


        # # 🧠 Optional: Visualize graph
        # # draw_graph(G)

        # source_node = list(G.nodes())[0]
        # target_node = list(G.nodes())[-1]

        # # Mock YOLO/LLM risk
        # def get_mock_risk(coord):
        #     lat, lon = coord
        #     # Add fake "danger" near southern latitudes (e.g., closer to LA)
        #     if lat < 36.0:
        #         return 10  # high risk
        #     elif lat > 37.8:
        #         return 1   # low risk
        #     else:
        #         return 5   # medium risk

        #     # After building the normal graph:
        # for u, v in list(G.edges()):
        #     # Add a detour edge with slightly longer duration, lower risk
        #     # detour_u = (u[0] + 0.05, u[1] + 0.05)
        #     # detour_v = (v[0] + 0.05, v[1] + 0.05)
        #     # G.add_edge(detour_u, detour_v, duration=G[u][v]['duration'] * 1.2)
        #     # G[u][v]['risk_weight']=G[u][v]['duration'] + risk * 100

        #     risk = get_mock_risk(u) + get_mock_risk(v)
        #     G[u][v]['risk_weight'] = G[u][v]['duration'] + risk * 100

        # try:
        #     fastest_path = nx.astar_path(G, source_node, target_node, weight="duration")
        # except:
        #     fastest_path = []

        # try:
        #     safest_path = nx.astar_path(G, source_node, target_node, weight="risk_weight")
        # except Exception as e:
        #     safest_path = []
        #     print("A* path error:", e)

        # def route_stats(path, G):
        #     total_duration = sum(G[u][v]['duration'] for u, v in zip(path, path[1:]))
        #     total_risk = sum(G[u][v].get('risk_weight', 0) for u, v in zip(path, path[1:]))
        #     return round(total_duration, 2), round(total_risk, 2)

        # # duration_sec, risk_score = route_stats(safest_path, G)
        # fast_duration, _ = route_stats(fastest_path, G)
        # safe_duration, safe_score = route_stats(safest_path, G)
        # draw_graph(G, best_path=safest_path)
        # draw_graph(G, best_path=fastest_path, filename="graph_fastest_path.png")


        return jsonify({
            "nodes": list(G.nodes()),
            "edges": [
                {
                    "from": u,
                    "to": v,
                    "distance_km": d["distance"],
                    "duration_sec": d["duration"],
                    "risk_weight": d.get("risk_weight", 0)
                }
                for u, v, d in G.edges(data=True)
            ],
            "fastest_path": fastest_path,
            "fastest_duration_sec": fast_duration,

            "safest_path": safest_path,
            "safest_duration_sec": safe_duration,
            "safest_risk_score": safe_score
        })


    except Exception as e:
        print("Error building graph:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
