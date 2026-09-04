import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const API_BASE = "http://127.0.0.1:8000/api";

const PRELOAD_TICKERS = [
  { symbol: "AAPL", category: "LARGE_CAP" },
  { symbol: "NVDA", category: "HIGH_BETA" },
  { symbol: "MSFT", category: "LARGE_CAP" },
  { symbol: "TSLA", category: "HIGH_BETA" },
  { symbol: "AMZN", category: "LARGE_CAP" },
  { symbol: "GOOGL", category: "LARGE_CAP" },
  { symbol: "META", category: "HIGH_BETA" },
  { symbol: "SPY", category: "STABLE" },
  { symbol: "QQQ", category: "STABLE" },
  { symbol: "INTC", category: "HIGH_BETA" }
];

const COLOR_PALETTE = [
  "#34d399", "#f87171", "#60a5fa", "#c084fc", "#facc15", 
  "#fb923c", "#38bdf8", "#a3e635", "#f472b6", "#94a3b8"
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [watchlist, setWatchlist] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [category, setCategory] = useState('LARGE_CAP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (authMode === "register") {
        await axios.post(`${API_BASE}/register`, { email, password });
        alert("Registration successful! Please log in.");
        setAuthMode("login");
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const res = await axios.post(`${API_BASE}/token`, formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        const newToken = res.data.access_token;
        localStorage.setItem("token", newToken);
        setToken(newToken);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setWatchlist([]);
  };

  const fetchWatchlist = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/watchlist`, getAuthConfig());
      setWatchlist(res.data);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to connect to backend engine.");
      }
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [token]);

  const handleAdd = async (e, tickerSymbol = symbol, tickerCategory = category) => {
    if (e) e.preventDefault();
    if (!tickerSymbol) return;
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE}/watchlist`, {
        symbol: tickerSymbol,
        asset_category: tickerCategory
      }, getAuthConfig());
      
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
      await axios.delete(`${API_BASE}/watchlist/${targetSymbol}`, getAuthConfig());
      fetchWatchlist();
    } catch (err) {
      setError("Failed to delete ticker");
    }
  };

  const handleCaptureSnapshot = async () => {
    try {
      await axios.post(`${API_BASE}/snapshot`, {}, getAuthConfig());
      alert("Baseline Snapshot stored! Relative changes are now calculated against this point.");
      fetchWatchlist();
    } catch (err) {
      setError("Failed to capture snapshot");
    }
  };

  const handleSimulateMove = async (targetSymbol) => {
    try {
      await axios.post(`${API_BASE}/simulate-move/${targetSymbol}?pct_change=3.5`, {}, getAuthConfig());
      fetchWatchlist();
    } catch (err) {
      setError("Failed to simulate price move");
    }
  };

  // Generate multi-series data for comparison graph
  const generateMultiChartData = () => {
    const points = [
      { name: 'T-5' }, { name: 'T-4' }, { name: 'T-3' }, 
      { name: 'T-2' }, { name: 'T-1' }, { name: 'Current' }
    ];

    return points.map((p, idx) => {
      const pointObj = { name: p.name };
      watchlist.forEach((item) => {
        const base = item.price || 100;
        const diff = item.diff_since_last_visit || 0;
        // Interpolate trajectory ending at current diff %
        const stepVal = ((idx / 5) * diff).toFixed(2);
        pointObj[item.symbol] = parseFloat(stepVal);
      });
      return pointObj;
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-emerald-400">Smart Watchlist Engine</h1>
            <p className="text-slate-400 text-sm mt-1">Sign in to track volatility-adjusted market shifts</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-lg text-white mt-1 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-lg text-white mt-1 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {error && <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-xs">{error}</div>}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold py-2.5 rounded-lg text-white transition cursor-pointer"
            >
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setError(""); }}
              className="text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              {authMode === "login" ? "Register" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-emerald-400">Smart Market Watchlist</h1>
            <p className="text-slate-400 text-sm">Volatility-Adjusted Relative Change Engine</p>
          </div>
          
          <div className="flex gap-3 items-center">
            <button
              onClick={handleCaptureSnapshot}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition cursor-pointer"
            >
              Save Visit Snapshot
            </button>
            <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-slate-300 font-mono">
              {email || "Logged In"}
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-lg text-sm transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Executive Summary Alert Banner */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Attention Digest</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {watchlist.filter(i => i.has_meaningful_change).length > 0 
                ? `${watchlist.filter(i => i.has_meaningful_change).length} asset(s) breached volatility thresholds.`
                : "No anomalous price moves detected since last visit."}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-3 py-1 rounded-full font-medium">
              {watchlist.filter(i => i.has_meaningful_change).length} Actionable
            </span>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-3 py-1 rounded-full font-medium">
              {watchlist.length} Total Monitored
            </span>
          </div>
        </div>

        {/* Main Grid: Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Watchlist & Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
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
                className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="LARGE_CAP">Large Cap (&gt; 1.2%)</option>
                <option value="HIGH_BETA">High Beta (&gt; 3.0%)</option>
                <option value="STABLE">Stable / ETF (&gt; 0.75%)</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-lg font-semibold text-white transition text-sm cursor-pointer"
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </form>

            {/* Quick Add Ticker Bar */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 mb-2 font-medium">Quick Track Top 10 Stocks:</div>
              <div className="flex flex-wrap gap-1.5">
                {PRELOAD_TICKERS.map((pt) => (
                  <button
                    key={pt.symbol}
                    onClick={() => handleAdd(null, pt.symbol, pt.category)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded transition cursor-pointer"
                  >
                    + {pt.symbol}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-sm">{error}</div>}

            {/* Active Watchlist Grid */}
            <div className="space-y-3">
              {watchlist.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{item.symbol}</span>
                      <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                        {item.category}
                      </span>
                      {item.is_stale && (
                        <span className="text-[10px] bg-amber-950/60 border border-amber-800 text-amber-400 px-2 py-0.5 rounded">
                          Cached
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Price: {item.price ? `$${item.price}` : 'Unavailable'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">Since Visit</div>
                      {item.has_baseline ? (
                        <div className={`font-mono text-xs font-bold ${
                          item.diff_since_last_visit > 0 ? 'text-emerald-400' : 
                          item.diff_since_last_visit < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {item.diff_since_last_visit > 0 ? '+' : ''}{item.diff_since_last_visit}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 italic">No baseline</div>
                      )}
                    </div>

                    {item.has_meaningful_change && (
                      <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-semibold animate-pulse">
                        Meaningful Move
                      </div>
                    )}

                    <button
                      onClick={() => handleSimulateMove(item.symbol)}
                      className="text-[10px] bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 px-2 py-1 rounded transition cursor-pointer"
                      title="Simulate a +3.5% move for demo"
                    >
                      +3.5% Shift
                    </button>

                    <button
                      onClick={() => handleDelete(item.symbol)}
                      className="text-slate-500 hover:text-rose-400 text-xs transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Comparative Graph & Insights Bulletin (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Multi-Asset Comparative Recharts Chart */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200">Relative Delta Spectrum (%)</h3>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Baseline Comparison</span>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMultiChartData()}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} unit="%" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {watchlist.map((item, idx) => (
                      <Line
                        key={item.symbol}
                        type="monotone"
                        dataKey={item.symbol}
                        stroke={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Bulletin Insights Box */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">Asset Growth Insights</h3>
              
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {watchlist.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No stocks tracked in watchlist.</p>
                )}
                {watchlist.map((item) => {
                  const grown = item.diff_since_last_visit > 0;
                  const flat = item.diff_since_last_visit === 0;

                  return (
                    <li key={item.symbol} className="text-xs flex items-start justify-between bg-slate-950 p-2.5 rounded border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200">{item.symbol}</span>
                        <span className="text-slate-400 ml-1.5">
                          {flat ? "remained unchanged" : grown ? "gained" : "declined"}
                          {item.has_baseline ? ` by ${Math.abs(item.diff_since_last_visit)}%` : " (baseline pending)"}
                        </span>
                      </div>
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                        flat ? 'bg-slate-800 text-slate-400' :
                        grown ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 
                        'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {grown ? 'GROWTH' : flat ? 'FLAT' : 'DECLINE'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}