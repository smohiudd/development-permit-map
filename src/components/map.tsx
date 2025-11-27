import { useMemo, useRef, useState } from "react";
import {Map as MaplibreMap, MapRef, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { DeckProps } from "@deck.gl/core";
import { GeoArrowScatterplotLayer } from "@geoarrow/deck.gl-layers";
import { Table } from "apache-arrow";
import DateTimeSlider from "./DateTimeSlider";
import { CATEGORY_COLORS, DEFAULT_COLOR, ALL_CATEGORIES, SUBCATEGORIES, SUBCATEGORY_COLORS } from "./categoryColors";

import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
    data?: Table;
    selectedDate?: Date;
    minDate?: Date;
    maxDate?: Date;
    onDateChange?: (date: Date) => void;
  }
  
function DeckGLOverlay(props: DeckProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

export default function Map({data, selectedDate, minDate, maxDate, onDateChange}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const layers = useMemo(() => {
    if (!selectedDate) return [];
    
    // Get YYYY-MM format for month comparison
    const selectedYearMonth = selectedDate.toISOString().slice(0, 7); // YYYY-MM

    return [
      data && new GeoArrowScatterplotLayer({ 
        id: "dp-applications", 
        data: data,
        getPosition: data!.getChild("geometry")!,
        getFillColor: ({ index, data }) => {
          const recordBatch = data.data;
          const row = recordBatch.get(index);
          const releaseDate = row?.["ReleaseDate"];
          const category = row?.["Category"];
          
          // Get color for category, or default color if category not found
          let color: [number, number, number] = DEFAULT_COLOR;
          if (category && CATEGORY_COLORS.has(category)) {
            color = CATEGORY_COLORS.get(category)!;
          }
          
          if (!releaseDate) return [color[0], color[1], color[2], 0];
          
          // Filter by category if one is selected
          if (selectedCategory !== "All" && category !== selectedCategory) {
            return [color[0], color[1], color[2], 0];
          }
          
          // Compare by month (YYYY-MM format)
          const releaseYearMonth = releaseDate.slice(0, 7);
          
          if (releaseYearMonth === selectedYearMonth) {
            // Return color with opacity
            return [color[0], color[1], color[2], 200];
          } else {
            // Points not matching: transparent (use same color, just 0 opacity)
            return [color[0], color[1], color[2], 0];
          }
        },
        radiusMinPixels: 5,
        transitions: {
          getFillColor: {
            duration: 500,
            easing: (t: number) => t * (2 - t), // ease-out
          },
        },
        updateTriggers: {
          getFillColor: [selectedDate, selectedCategory]
        },
      }),
    ];
  }, [data, selectedDate, selectedCategory]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MaplibreMap
        ref={mapRef}
        initialViewState={{
          longitude:  -114.07200,
          latitude: 51.04609,
          zoom: 9.5,
        }}
        minZoom={9}
        maxZoom={12}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      >
        <DeckGLOverlay layers={layers} />
      </MaplibreMap>
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 1000,
        backgroundColor: "#f5f5f5",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        maxWidth: "280px",
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
      }}>
        {/* Title */}
        <h1 style={{
          margin: "0 0 2px 0",
          fontSize: "27px",
          fontWeight: "600",
          color: "#1a1a1a",
          lineHeight: "1.2",
        }}>
          Development Permit Timeline
        </h1>
        
        {/* Subtitle */}
        <p style={{
          margin: "0 0 20px 0",
          fontSize: "18px",
          color: "#666",
          lineHeight: "1.2",
        }}>
          Explore development permits in Calgary by category and time period
        </p>

        {/* Category Filter */}
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="category-filter" style={{ 
            display: "block", 
            marginBottom: "4px", 
            fontSize: "12px", 
            fontWeight: "600",
            color: "#333",
          }}>
            Filter by Category:
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              fontSize: "14px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: "pointer",
              transition: "border-color 0.2s",
              marginBottom: "8px", 
            }}
            onFocus={(e) => e.target.style.borderColor = "#1a73e8"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          >
            <option value="All">All Categories</option>
            {ALL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div>
          <h3 style={{
            margin: "0 0 6px 0",
            fontSize: "13px",
            fontWeight: "600",
            color: "#333",
            borderBottom: "1px solid #eee",
            paddingBottom: "4px",
          }}>
            Legend
          </h3>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            maxHeight: "250px",
            overflowY: "auto",
            paddingRight: "2px",
          }}>
            {SUBCATEGORIES.map((subcategory) => {
              const color = SUBCATEGORY_COLORS.get(subcategory) || DEFAULT_COLOR;
              return (
                <div
                  key={subcategory}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "2px 0",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                      flexShrink: 0,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                  />
                  <span style={{
                    fontSize: "14px",
                    color: "#555",
                    lineHeight: "1.2",
                  }}>
                    {subcategory}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {minDate && maxDate && selectedDate && onDateChange && (
        <DateTimeSlider
          minDate={minDate}
          maxDate={maxDate}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          data={data}
          selectedCategory={selectedCategory}
        />
      )}
    </div>
  );
}

