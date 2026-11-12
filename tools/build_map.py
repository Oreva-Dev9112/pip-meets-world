#!/usr/bin/env python3
"""Turn an OpenStreetMap export into the small map file the game loads.

Usage:
    python3 tools/build_map.py map.osm public/maps/soho.json

The export is not kept in this repo. Download one for the same area with:
    https://api.openstreetmap.org/api/0.6/map?bbox=-0.1418,51.5098,-0.1288,51.5167

What is kept: street lines and names, building outlines, green spaces, the
*kind* of each place (cafe, pub, theatre...), station names and street
furniture. Business names are dropped on purpose.

Coordinates are metres from the top-left corner of the area, stored as whole
decimetres to keep the file small. Map data (c) OpenStreetMap contributors, ODbL.
"""
import json
import math
import sys
import xml.etree.ElementTree as ET

STREET_KINDS = {
    "primary": "major", "primary_link": "major", "secondary": "major", "tertiary": "major", "tertiary_link": "major",
    "unclassified": "minor", "residential": "minor", "living_street": "minor", "service": "lane", "pedestrian": "walk",
}
PLACE_KINDS = {
    "cafe": "cafe", "pub": "pub", "bar": "pub", "restaurant": "food", "fast_food": "food", "ice_cream": "treat",
    "theatre": "theatre", "cinema": "theatre",
}
SHOP_KINDS = {"bakery": "bakery", "books": "books", "music": "records", "confectionery": "treat", "pastry": "bakery"}
PROP_KINDS = {"telephone": "phone", "bench": "bench", "post_box": "postbox", "waste_basket": "bin"}


def main(src: str, dest: str) -> None:
    root = ET.parse(src).getroot()
    b = root.find("bounds").attrib
    min_lat, max_lat, min_lon, max_lon = (float(b[k]) for k in ("minlat", "maxlat", "minlon", "maxlon"))
    kx = 111320 * math.cos(math.radians((min_lat + max_lat) / 2))
    ky = 110540
    width, height = (max_lon - min_lon) * kx, (max_lat - min_lat) * ky

    def project(lat: float, lon: float) -> tuple[int, int]:
        return round((lon - min_lon) * kx * 10), round((max_lat - lat) * ky * 10)

    def inside(p: tuple[int, int]) -> bool:
        return -200 <= p[0] <= width * 10 + 200 and -200 <= p[1] <= height * 10 + 200

    pos: dict[str, tuple[int, int]] = {}
    places, props, stations = [], [], []
    for n in root.iter("node"):
        p = project(float(n.get("lat")), float(n.get("lon")))
        pos[n.get("id")] = p
        tags = {t.get("k"): t.get("v") for t in n.findall("tag")}
        if not tags or not inside(p):
            continue
        kind = PLACE_KINDS.get(tags.get("amenity", "")) or SHOP_KINDS.get(tags.get("shop", ""))
        if kind:
            places.append([kind, p[0], p[1]])
        elif tags.get("amenity") in PROP_KINDS:
            props.append([PROP_KINDS[tags["amenity"]], p[0], p[1]])
        elif tags.get("natural") == "tree":
            props.append(["tree", p[0], p[1]])
        elif tags.get("railway") == "station" and tags.get("name"):
            stations.append([tags["name"], p[0], p[1]])

    node_index: dict[str, int] = {}
    nodes: list[int] = []
    streets, buildings, greens = [], [], []

    def flat(refs: list[str]) -> list[int]:
        out: list[int] = []
        for r in refs:
            if r in pos:
                out.extend(pos[r])
        return out

    def centre(refs: list[str]) -> tuple[int, int]:
        pts = [pos[r] for r in refs if r in pos]
        return round(sum(p[0] for p in pts) / len(pts)), round(sum(p[1] for p in pts) / len(pts))

    for w in root.iter("way"):
        refs = [nd.get("ref") for nd in w.findall("nd")]
        refs = [r for r in refs if r in pos]
        tags = {t.get("k"): t.get("v") for t in w.findall("tag")}
        if len(refs) < 2 or not any(inside(pos[r]) for r in refs):
            continue
        closed = refs[0] == refs[-1] and len(refs) > 3
        kind = STREET_KINDS.get(tags.get("highway", ""))
        if kind and tags.get("area") != "yes" and tags.get("tunnel") != "yes":
            ids = []
            for r in refs:
                if r not in node_index:
                    node_index[r] = len(nodes) // 2
                    nodes.extend(pos[r])
                ids.append(node_index[r])
            streets.append({"k": kind, "name": tags.get("name", ""), "n": ids})
        elif "building" in tags and closed:
            buildings.append(flat(refs[:-1]))
            place = PLACE_KINDS.get(tags.get("amenity", "")) or SHOP_KINDS.get(tags.get("shop", ""))
            if place:
                places.append([place, *centre(refs)])
        elif closed and (tags.get("leisure") in ("park", "garden") or tags.get("landuse") in ("grass", "village_green")):
            greens.append({"name": tags.get("name", ""), "p": flat(refs[:-1])})
        elif closed and tags.get("highway") == "pedestrian":
            greens.append({"name": tags.get("name", ""), "paved": True, "p": flat(refs[:-1])})

    seen = set()
    stations = [s for s in stations if not (s[0] in seen or seen.add(s[0]))]
    data = {
        "name": "Soho",
        "credit": "Map data (c) OpenStreetMap contributors, ODbL",
        "unit": 0.1,
        "width": round(width, 1),
        "height": round(height, 1),
        "nodes": nodes,
        "streets": streets,
        "buildings": buildings,
        "greens": greens,
        "places": places,
        "props": props,
        "stations": stations,
    }
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    print(f"{dest}: {width:.0f} x {height:.0f} m, {len(streets)} streets, {len(buildings)} buildings, "
          f"{len(greens)} green or paved areas, {len(places)} places, {len(props)} props, {len(stations)} stations")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
