import { useMemo, useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Table } from "apache-arrow";
import { SUBCATEGORY_TO_CATEGORIES, SUBCATEGORY_COLORS, DEFAULT_COLOR } from "./categoryColors";
import "./DateTimeSlider.css";

interface DateTimeSliderProps {
  minDate: Date;
  maxDate: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  data?: Table;
  selectedCategory?: string;
}

export default function DateTimeSlider({
  minDate,
  maxDate,
  selectedDate,
  onDateChange,
  data,
  selectedCategory = "All",
}: DateTimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const histogramRef = useRef<SVGSVGElement>(null);

  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();
  const selectedTime = selectedDate.getTime();

  const percentage = useMemo(() => {
    return ((selectedTime - minTime) / (maxTime - minTime)) * 100;
  }, [selectedTime, minTime, maxTime]);

  // Helper function to get subcategory from category
  const getSubcategory = (category: string): string | null => {
    for (const [subcategory, categories] of Object.entries(SUBCATEGORY_TO_CATEGORIES)) {
      if (categories.includes(category)) {
        return subcategory;
      }
    }
    return null;
  };

  // Compute histogram data by subcategory
  const histogramData = useMemo(() => {
    if (!data) return [];

    // Map: month -> subcategory -> count
    const countsBySubcategory = new Map<string, Map<string, number>>();
    const releaseDateColumn = data.getChild("ReleaseDate");
    const categoryColumn = data.getChild("Category");

    if (!releaseDateColumn) return [];

    const releaseDates = releaseDateColumn.toArray();
    const categories = categoryColumn?.toArray() || [];

    for (let i = 0; i < releaseDates.length; i++) {
      const releaseDate = releaseDates[i];
      if (!releaseDate) continue;

      const category = categories[i];
      if (!category) continue;
      
      // Filter by category if one is selected
      if (selectedCategory !== "All" && category !== selectedCategory) {
        continue;
      }

      const subcategory = getSubcategory(category) || "Other";
      const yearMonth = releaseDate.slice(0, 7);

      if (!countsBySubcategory.has(yearMonth)) {
        countsBySubcategory.set(yearMonth, new Map());
      }
      const monthCounts = countsBySubcategory.get(yearMonth)!;
      monthCounts.set(subcategory, (monthCounts.get(subcategory) || 0) + 1);
    }

    // Generate all months between min and max date
    const months: { month: string; subcategories: Map<string, number> }[] = [];
    const current = new Date(minDate);
    current.setDate(1);

    while (current <= maxDate) {
      const yearMonth = current.toISOString().slice(0, 7);
      months.push({
        month: yearMonth,
        subcategories: countsBySubcategory.get(yearMonth) || new Map(),
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }, [data, minDate, maxDate, selectedCategory]);

  // Draw histogram
  useEffect(() => {
    if (!histogramRef.current || histogramData.length === 0) return;

    const svg = d3.select(histogramRef.current);
    svg.selectAll("*").remove();

    const container = histogramRef.current.parentElement;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = 40;
    const margin = { top: 3, right: 5, bottom: 3, left: 5 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "none");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(histogramData.map((d) => d.month))
      .range([0, innerWidth])
      .padding(0.1);

    // Calculate max total count from filtered data (variable y-axis)
    const maxCount = d3.max(histogramData, (d) => {
      let total = 0;
      d.subcategories.forEach((count) => {
        total += count;
      });
      return total;
    }) || 1;

    const yScale = d3.scaleLinear().domain([0, maxCount]).range([innerHeight, 0]);

    // Add y-axis label showing max value (positioned as overlay, not affecting bar alignment)
    svg.append("text")
      .attr("x", 5)
      .attr("y", 8)
      .attr("text-anchor", "start")
      .attr("font-size", "11px")
      .attr("fill", "#666")
      .attr("font-weight", "500")
      .text(maxCount.toString());

    // Draw stacked bars for each month
    histogramData.forEach((monthData) => {
      const month = monthData.month;
      const x = xScale(month) || 0;
      const width = xScale.bandwidth();
      let yOffset = innerHeight;

      // Sort subcategories for consistent stacking
      const subcategoryEntries = Array.from(monthData.subcategories.entries()).sort((a, b) => b[1] - a[1]);

      subcategoryEntries.forEach(([subcategory, count]) => {
        const color = SUBCATEGORY_COLORS.get(subcategory) || DEFAULT_COLOR;
        const barHeight = yScale(0) - yScale(count);

        g.append("rect")
          .attr("x", x)
          .attr("y", yOffset - barHeight)
          .attr("width", width)
          .attr("height", barHeight)
          .attr("fill", `rgb(${color[0]}, ${color[1]}, ${color[2]})`)
          .attr("opacity", 1);

        yOffset -= barHeight;
      });
    });
  }, [histogramData, selectedDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newTime = minTime + (value / 100) * (maxTime - minTime);
    const newDate = new Date(newTime);
    // Ensure we're on the first day of the month
    newDate.setDate(1);
    onDateChange(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setIsPlaying(false);
    const resetDate = new Date(minDate);
    resetDate.setDate(1);
    onDateChange(resetDate);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const currentDate = new Date(selectedDate);
        const nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(1); // Ensure first day of month

        // Stop if we've reached or exceeded maxDate
        if (nextDate.getTime() > maxDate.getTime()) {
          setIsPlaying(false);
          onDateChange(new Date(maxDate));
        } else {
          onDateChange(nextDate);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, selectedDate, maxDate, onDateChange]);

  return (
    <div className="datetime-slider-container">
      <div className="datetime-slider-label">
        <span>{formatDate(minDate)}</span>
        <span className="datetime-slider-selected">{formatDate(selectedDate)}</span>
        <span>{formatDate(maxDate)}</span>
      </div>
      <div style={{ position: "relative", width: "100%", marginBottom: "4px", overflow: "hidden" }}>
        <svg ref={histogramRef} style={{ width: "100%", height: "40px", display: "block" }} />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="0.01"
        value={percentage}
        onChange={handleChange}
        className="datetime-slider"
      />
      <div className="datetime-slider-controls">
        <button onClick={togglePlayPause} className="datetime-slider-button">
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={reset} className="datetime-slider-button">
          ↺ Reset
        </button>
      </div>
    </div>
  );
}

