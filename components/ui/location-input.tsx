'use client';

import * as React from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { initGoogleMapsOptions, LocationCoords } from './google-map';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationInputProps {
  value?: string;
  onChange?: (value: string, placeId?: string, coords?: LocationCoords) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationInput({
  value,
  onChange,
  placeholder = 'Search for a location...',
  disabled = false,
  className,
}: LocationInputProps) {
  const [inputValue, setInputValue] = React.useState(value || '');
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const containerRef = React.useRef<HTMLDivElement>(null);
  const placesServiceDivRef = React.useRef<HTMLDivElement | null>(null);

  // Initialize Google Maps
  React.useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        initGoogleMapsOptions();

        const placesLib = await importLibrary('places');

        autocompleteService.current = new placesLib.AutocompleteService();

        // Create a temporary div for PlacesService (it requires a map or div)
        if (!placesServiceDivRef.current) {
          placesServiceDivRef.current = document.createElement('div');
        }
        placesService.current = new placesLib.PlacesService(
          placesServiceDivRef.current,
        );

        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initGoogleMaps();
  }, []);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = React.useCallback(async (input: string) => {
    if (!input.trim() || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await new Promise<PlacePrediction[]>((resolve) => {
        autocompleteService.current!.getPlacePredictions(
          {
            input,
            types: ['establishment', 'geocode'],
          },
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              resolve(predictions as unknown as PlacePrediction[]);
            } else {
              resolve([]);
            }
          },
        );
      });
      setPredictions(response);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && isInitialized) {
        fetchPredictions(inputValue);
      } else {
        setPredictions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, fetchPredictions, isInitialized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    onChange?.(newValue);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setInputValue(prediction.description);
    setIsOpen(false);
    setPredictions([]);

    // Get place details to get coordinates
    if (placesService.current) {
      try {
        const placeDetails =
          await new Promise<google.maps.places.PlaceResult | null>(
            (resolve) => {
              placesService.current!.getDetails(
                {
                  placeId: prediction.place_id,
                  fields: ['geometry'],
                },
                (result, status) => {
                  if (
                    status === google.maps.places.PlacesServiceStatus.OK &&
                    result
                  ) {
                    resolve(result);
                  } else {
                    resolve(null);
                  }
                },
              );
            },
          );

        if (placeDetails?.geometry?.location) {
          const coords = {
            lat: placeDetails.geometry.location.lat(),
            lng: placeDetails.geometry.location.lng(),
          };
          onChange?.(prediction.description, prediction.place_id, coords);
        } else {
          onChange?.(prediction.description, prediction.place_id);
        }
      } catch (error) {
        console.error('Error getting place details:', error);
        onChange?.(prediction.description, prediction.place_id);
      }
    } else {
      onChange?.(prediction.description, prediction.place_id);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled || !isInitialized}
          className="pl-10"
        />
        {!isInitialized && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-md">
          <ul className="max-h-60 overflow-auto py-1">
            {predictions.map((prediction) => (
              <li
                key={prediction.place_id}
                onClick={() => handleSelectPrediction(prediction)}
                className="hover:bg-accent flex cursor-pointer items-start gap-3 px-3 py-2"
              >
                <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {prediction.structured_formatting.main_text}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {prediction.structured_formatting.secondary_text}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && isLoading && (
        <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border p-3 shadow-md">
          <span className="text-muted-foreground text-sm">Searching...</span>
        </div>
      )}
    </div>
  );
}
