import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_nearby_entities(center_lat, center_lng, candidates, radius_km=10, lat_attr='lat', lng_attr='lng'):
    if center_lat is None or center_lng is None:
        return []

    nearby_list = []
    
    for item in candidates:
        if isinstance(item, dict):
            item_lat = item.get(lat_attr)
            item_lng = item.get(lng_attr)
        else:
            item_lat = getattr(item, lat_attr, None)
            item_lng = getattr(item, lng_attr, None)

        if item_lat is not None and item_lng is not None:
            try:
                dist = haversine(center_lat, center_lng, item_lat, item_lng)
                if radius_km is None or dist <= radius_km:
                    nearby_list.append({
                        "distance_km": dist,
                        "entity": item
                    })
            except ValueError:
                pass

    nearby_list.sort(key=lambda x: x["distance_km"])
    return nearby_list
