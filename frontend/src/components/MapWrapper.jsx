import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    }
  });
  return position ? <Marker position={position} /> : null;
}

export default function MapWrapper({ listings = [], center = [20.5937, 78.9629], zoom = 4, onMarkerClick, pickerMode = false, position, setPosition }) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      
      {pickerMode ? (
        <LocationPicker position={position} setPosition={setPosition} />
      ) : (
        listings.filter(l => l.latitude && l.longitude).map(l => (
          <Marker key={l.id} position={[l.latitude, l.longitude]} eventHandlers={{ click: () => onMarkerClick && onMarkerClick(l) }}>
            <Popup>
              <div className="text-sm font-semibold mb-1">{l.title}</div>
              <div className="text-xs text-gray-500 mb-2">{l.quantity} {l.unit} remaining</div>
              <a href={`/food/${l.id}`} className="text-blue-600 hover:underline text-xs">View Details</a>
            </Popup>
          </Marker>
        ))
      )}
    </MapContainer>
  );
}
