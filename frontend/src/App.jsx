import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = "http://127.0.0.1:8000/api";

export default function App() {
  const [watchlist, setWatchlist] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [category, setCategory] = useState('LARGE_CAP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`${API_BASE}/watchlist`);
      setWatchlist(res.data);
    } catch (err) {
      setError("Failed to connect to backend engine.");
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!symbol) return;
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE}/watchlist`, {
        symbol: symbol,
        asset_category: category
      });
      setSymbol('');
      fetchWatchlist();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add ticker");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (targetSymbol) => {
    try {
      await axios.delete(`${API_BASE}/watchlist/${targetSymbol}`);
      fetchWatchlist();
    } catch (err) {
      setError("Failed to delete ticker");
    }
  };

  const handleCaptureSnapshot = async () => {
    try {
      await axios.post(`${API_BASE}/snapshot`);
      alert("Snapshot stored! Future reloads will measure relative diffs against this baseline.");
      fetchWatchlist();
    } catch (err) {
      setError("Failed to capture snapshot");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-emerald-400">Smart Market Watchlist</h1>
            <p className="text-slate-400 text-sm">Volatility-Adjusted Relative Change Tracker</p>
          </div>
          <button
            onClick={handleCaptureSnapshot}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
          >
            Save Visit Snapshot
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAdd} className="flex gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <input
            type="text"
            placeholder="Symbol (e.g. AAPL, NVDA)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500 flex-1 uppercase"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="LARGE_CAP">Large Cap (Trigger: &gt; 1.2%)</option>
            <option value="HIGH_BETA">High Beta / Growth (Trigger: &gt; 3.0%)</option>
            <option value="STABLE">Stable / ETF (Trigger: &gt; 0.75%)</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg font-semibold text-white transition"
          >
            {loading ? 'Adding...' : 'Add Ticker'}
          </button>
        </form>

        {error && <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-sm">{error}</div>}

        {/* Watchlist Grid */}
        <div className="grid gap-4">
          {watchlist.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">{item.symbol}</span>
                  <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                    {item.category}
                  </span>
                  {item.is_stale && (
                    <span className="text-xs bg-amber-950/60 border border-amber-800 text-amber-400 px-2 py-0.5 rounded">
                      Delayed / Cached
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  Price: {item.price ? `$${item.price}` : 'Unavailable'}
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Meaningful Change Badge */}
                <div className="text-right">
                  <div className="text-xs text-slate-500">Diff Since Last Visit</div>
                  {item.has_baseline ? (
                    <div className={`font-mono text-sm font-bold ${
                      item.diff_since_last_visit > 0 ? 'text-emerald-400' : 
                      item.diff_since_last_visit < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {item.diff_since_last_visit > 0 ? '+' : ''}{item.diff_since_last_visit}%
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">No baseline</div>
                  )}
                </div>

                {item.has_meaningful_change && (
                  <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-semibold animate-pulse">
                    Meaningful Move
                  </div>
                )}

                <button
                  onClick={() => handleDelete(item.symbol)}
                  className="text-slate-500 hover:text-rose-400 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}