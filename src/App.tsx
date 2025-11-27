import { useEffect, useState } from "react";
import initWasm, { readParquet } from "parquet-wasm"
import { tableFromIPC, Table } from "apache-arrow";
import Map from "./components/map";
import "./App.css";

const DATA_URL =
  "https://gtfs-parquet.s3.us-west-2.amazonaws.com/dp-applications.parquet";
const GEOMETRY_COLUMN = "geometry";


function App() {
  const [table, setTable] = useState<Table | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  //min max date from table
  const [minDate, setMinDate] = useState<Date | undefined>(undefined);
  const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    console.log("Loading data...");
    let cancelled = false;

    async function loadData() {
      try {
        await initWasm();
        const resp = await fetch(DATA_URL);
        if (!resp.ok) {
          throw new Error(`Failed to fetch GeoParquet (${resp.status})`);
        }
        const arrayBuffer = await resp.arrayBuffer();
        const wasmTable = readParquet(new Uint8Array(arrayBuffer));
        
        const jsTable = tableFromIPC(wasmTable.intoIPCStream());
        const dates_array = jsTable.getChild('ReleaseDate')?.toArray().map((date: string) => 
           new Date(Date.parse(date))
        );

        const minDate = Math.min(...dates_array);
        const maxDate = Math.max(...dates_array);

        const minDateObj = new Date(minDate);
        // Set to first day of the month
        minDateObj.setDate(1);
        const maxDateObj = new Date(maxDate);
        // Set to first day of the month
        maxDateObj.setDate(1);

        setMinDate(minDateObj);
        setMaxDate(maxDateObj);
        setSelectedDate(new Date(minDateObj));

        console.log(minDateObj, maxDateObj);

        if (!jsTable.getChild(GEOMETRY_COLUMN)) {
          throw new Error(`Missing geometry column "${GEOMETRY_COLUMN}"`);
        }
        if (!cancelled) {
          setTable(jsTable);
        }
      } catch (err) {
        console.error("readParquet failed", err);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);


  return (
    <div className="app-shell">
      <Map 
        data={table} 
        selectedDate={selectedDate}
        minDate={minDate}
        maxDate={maxDate}
        onDateChange={setSelectedDate}
      />
    </div>
  );
}

export default App;
