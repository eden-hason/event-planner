'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const placesServiceDivRef = React.useRef<HTMLDivElement | null>(null);

  // Initialize Google Maps
  React.useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        initGoogleMapsOptions();

        const placesLib = await importLibrary('places');

        autocompleteService.current = new placesLib.AutocompleteService();

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

  const fetchPredictions = React.useCallback(async (input: string) => {
    if (!input.trim() || !autocompleteService.current) {
      setPredictions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
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

  // Debounce search based on searchQuery
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && isInitialized) {
        fetchPredictions(searchQuery);
      } else {
        setPredictions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchPredictions, isInitialized]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchQuery(newValue);
    setIsOpen(true);
    onChange?.(newValue);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    const displayName = prediction.structured_formatting.main_text;
    setInputValue(displayName);
    setSearchQuery('');
    setPredictions([]);
    setHasSearched(false);
    setIsOpen(false);

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
          onChange?.(displayName, prediction.place_id, coords);
        } else {
          onChange?.(displayName, prediction.place_id);
        }
      } catch (error) {
        console.error('Error getting place details:', error);
        onChange?.(displayName, prediction.place_id);
      }
    } else {
      onChange?.(displayName, prediction.place_id);
    }
  };

  const hasNoResults =
    hasSearched && !isLoading && predictions.length === 0;
  const showCommandList = isOpen && (hasNoResults || predictions.length > 0);

  return (
    <Command
      className={cn('h-fit overflow-visible', className)}
      shouldFilter={false}
      loop
    >
      <div ref={containerRef} className="relative z-50">
        <InputGroup
          className={cn(
            '!border-input !bg-popover !ring-0',
            showCommandList && 'rounded-b-none',
          )}
        >
          <InputGroupAddon>
            <MapPin />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (predictions.length > 0 || hasNoResults) {
                setIsOpen(true);
              }
            }}
            disabled={disabled || !isInitialized}
          />
          {(isLoading || !isInitialized) && (
            <InputGroupAddon align="inline-end">
              <Spinner />
            </InputGroupAddon>
          )}
        </InputGroup>
        {showCommandList && (
          <CommandList
            data-state={showCommandList ? 'open' : 'closed'}
            className={cn(
              'bg-popover border-input absolute top-full right-0 left-0 rounded-b-md border border-t-0 shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2',
            )}
          >
            {hasNoResults && (
              <CommandEmpty>No locations found.</CommandEmpty>
            )}
            {predictions.length > 0 && (
              <CommandGroup>
                {predictions.map((prediction) => (
                  <CommandItem
                    key={prediction.place_id}
                    value={prediction.place_id}
                    onSelect={() => handleSelectPrediction(prediction)}
                  >
                    <MapPin />
                    <div className="flex flex-col items-start text-start">
                      <span className="font-medium">
                        {prediction.structured_formatting.main_text}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {prediction.structured_formatting.secondary_text}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </div>
    </Command>
  );
}
