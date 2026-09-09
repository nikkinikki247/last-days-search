import { useState } from "react";
import "./App.css";
import SearchBar from "./SearchBar.tsx";

type Result = {
  videoId: string;
  text: string;
  timestamp: number;
};

function App() {
  const [results, setResults] = useState<Result[]>([]);

  async function search(word: string) {
    const res = await fetch("http://localhost:3000/search", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        word,
      }),
    });

    const data = await res.json();

    setResults(data);
  }

  return (
    <>
      <SearchBar onSearch={search} />

      <h2>Results</h2>

      {results.map((result, index) => (
        <div key={index}>
          <p>{result.text}</p>

          <a
            href={`https://youtube.com/watch?v=${result.videoId}&t=${Math.floor(
              result.timestamp
            )}s`}
            target="_blank"
          >
            Go to timestamp
          </a>
        </div>
      ))}
    </>
  );
}

export default App;
