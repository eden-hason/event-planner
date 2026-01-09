'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { cn } from '@/lib/utils';

export interface LocationCoords {
  lat: number;
  lng: number;
}

// Silver/Gray map style - elegant monochrome theme with visible POI labels
const silverMapStyle: google.maps.MapTypeStyle[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#555555' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ saturation: -100 }, { lightness: 20 }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e8e8e8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7a7a7a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#e5e5e5' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9c9c9' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
];

interface GoogleMapProps {
  coords?: LocationCoords | null;
  zoom?: number;
  height?: string;
  className?: string;
  showMarker?: boolean;
  emptyStateText?: string;
}

// Track if options have been set
let optionsSet = false;

export function initGoogleMapsOptions() {
  if (!optionsSet) {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      v: 'weekly',
    });
    optionsSet = true;
  }
}

// Primary color marker SVG (matches app's primary color)
const PRIMARY_COLOR = '#ff2056';

const createMarkerIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path fill="${PRIMARY_COLOR}" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"/>
      <circle fill="white" cx="16" cy="16" r="6"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export function GoogleMap({
  coords,
  zoom = 15,
  height = '200px',
  className,
  showMarker = true,
  emptyStateText = 'Search for a location to see it on the map',
}: GoogleMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize Google Maps libraries
  React.useEffect(() => {
    const initLibraries = async () => {
      try {
        initGoogleMapsOptions();
        await importLibrary('maps');
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading Google Maps libraries:', error);
      }
    };

    initLibraries();
  }, []);

  // Cleanup on unmount to ensure fresh map creation
  React.useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
    };
  }, []);

  // Initialize/update map when coords change
  React.useEffect(() => {
    const initMap = async () => {
      if (!coords || !mapContainerRef.current || !isInitialized) return;

      try {
        const { Map } = await importLibrary('maps');

        // Always create a new map to ensure styles are applied
        // Clear existing marker first
        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }

        // Create map with silver styles (no mapId to avoid cloud styling override)
        mapRef.current = new Map(mapContainerRef.current, {
          center: coords,
          zoom,
          styles: silverMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
        });

        // Create marker with primary color
        if (showMarker) {
          markerRef.current = new google.maps.Marker({
            map: mapRef.current,
            position: coords,
            animation: google.maps.Animation.DROP,
            icon: {
              url: createMarkerIcon(),
              scaledSize: new google.maps.Size(32, 40),
              anchor: new google.maps.Point(40, 40), // Shifted left so marker appears to the right of POI
            },
          });
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();
  }, [coords, zoom, isInitialized, showMarker]);

  // Empty state - no coordinates provided
  if (!coords) {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border',
          className,
        )}
        style={{ height }}
      >
        {/* Gray gradient background with pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(148 163 184 / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(148 163 184 / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Empty state content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="rounded-full bg-slate-200/80 p-4">
            <MapPin className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">{emptyStateText}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={cn('w-full overflow-hidden rounded-lg border', className)}
      style={{ height }}
    />
  );
}
