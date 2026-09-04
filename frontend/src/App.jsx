import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell 
} from 'recharts';

const API_BASE = "https://smart-market-watchlist-6a1a.onrender.com/api";

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

// Color mapping matching Asset Allocation Breakdown
const CATEGORY_COLORS = {
  LARGE_CAP: '#3b82f6', // Blue
  HIGH_BETA: '#ec4899', // Pink
  STABLE: '#10b981'     // Green
};

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
        await axios.post(`${API_BASE}/register`, { 
          email: email, 
          username: email, 
          password: password 
        });
        alert("Registration successful! Switching to sign in...");
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
      setError(err.response?.data?.detail || "Authentication failed. Check your password or try signing in.");
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

  const handleResetBaseline = async () => {
    try {
      await axios.post(`${API_BASE}/reset-baseline`, {}, getAuthConfig());
      alert("Baseline cleared! All relative deltas reset to 0.00%.");
      fetchWatchlist();
    } catch (err) {
      setError("Failed to reset baseline");
    }
  };

  const handleSimulateMove = async (targetSymbol, pctChange = 3.5) => {
    try {
      await axios.post(`${API_BASE}/simulate-move/${targetSymbol}?pct_change=${pctChange}`, {}, getAuthConfig());
      fetchWatchlist();
    } catch (err) {
      setError("Failed to simulate price move");
    }
  };

  const actionableCount = watchlist.filter(i => i.has_meaningful_change).length;
  
  const sortedWatchlist = [...watchlist].sort((a, b) => b.diff_since_last_visit - a.diff_since_last_visit);
  const topGainer = sortedWatchlist.length > 0 && sortedWatchlist[0].diff_since_last_visit > 0 ? sortedWatchlist[0] : null;
  const topLoser = sortedWatchlist.length > 0 && sortedWatchlist[sortedWatchlist.length - 1].diff_since_last_visit < 0 ? sortedWatchlist[sortedWatchlist.length - 1] : null;

  const categoryCounts = [
    { name: 'Large Cap', value: watchlist.filter(i => i.category === 'LARGE_CAP').length, color: CATEGORY_COLORS.LARGE_CAP },
    { name: 'High Beta', value: watchlist.filter(i => i.category === 'HIGH_BETA').length, color: CATEGORY_COLORS.HIGH_BETA },
    { name: 'Stable ETF', value: watchlist.filter(i => i.category === 'STABLE').length, color: CATEGORY_COLORS.STABLE }
  ];

  // Pass category color for each bar
  const deltaReportData = watchlist.map(item => ({
    symbol: item.symbol,
    delta: item.diff_since_last_visit,
    color: CATEGORY_COLORS[item.category] || '#3b82f6'
  }));

  if (!token) {
    return (
      <div className="h-screen w-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-6 font-sans overflow-hidden">
        <div className="bg-[#0f172a] border border-slate-800/80 p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Smart Watchlist Engine</h1>
            <p className="text-slate-400 text-xs">Volatility-Adjusted Market Change Tracker</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#182238] border border-slate-700/60 px-4 py-2.5 rounded-xl text-white mt-1 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#182238] border border-slate-700/60 px-4 py-2.5 rounded-xl text-white mt-1 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            {error && <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">{error}</div>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 rounded-xl text-white transition cursor-pointer text-sm shadow-lg shadow-blue-600/20"
            >
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setError(""); }}
              className="text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              {authMode === "login" ? "Register" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#070a12] text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Header Navigation */}
      <header className="bg-[#0b101d] border-b border-slate-800/80 px-8 py-3.5 flex items-center justify-between shrink-0 w-full">
        <div>
          <h1 className="text-lg font-bold text-white">Smart Market Watchlist</h1>
          <p className="text-xs text-slate-400">Relative Volatility & Change Detection</p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCaptureSnapshot}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-blue-600/20"
          >
            Save Visit Snapshot
          </button>

          <button
            onClick={handleResetBaseline}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition border border-slate-700/60 cursor-pointer"
          >
            Reset Baseline
          </button>

          <div className="flex items-center gap-2 bg-[#131b2e] border border-slate-800/80 px-3 py-1.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center text-[10px] font-bold">
              {email ? email[0].toUpperCase() : "U"}
            </div>
            <span className="text-xs text-slate-200 font-medium">{email || "Logged In"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-700/60 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 w-full">
        
        {/* Feature #1: Attention Digest Executive Summary Banner */}
        <div className="bg-[#0e172e] border border-blue-900/60 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              Attention Digest
            </h4>
            <p className="text-xs text-slate-300">
              {actionableCount > 0 
                ? `${actionableCount} monitored asset(s) breached category volatility thresholds since your baseline.`
                : "All tracked assets are currently trading within expected baseline variance ranges."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800 px-3 py-1.5 rounded-xl">
              {actionableCount} Actionable Shift(s)
            </span>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">Monitored Assets</p>
            <p className="text-2xl font-bold text-white mt-2">{watchlist.length}</p>
            <p className="text-[10px] text-blue-400 mt-1">Active portfolio items</p>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">Meaningful Move Alerts</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{actionableCount}</p>
            <p className="text-[10px] text-emerald-400 mt-1">Breached volatility limits</p>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">Top Gainer (Since Baseline)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2">
              {topGainer ? `${topGainer.symbol} +${topGainer.diff_since_last_visit}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Highest relative shift</p>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">Top Loser (Since Baseline)</p>
            <p className="text-2xl font-bold text-rose-400 mt-2">
              {topLoser ? `${topLoser.symbol} ${topLoser.diff_since_last_visit}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Lowest relative shift</p>
          </div>

        </div>

        {/* Quick Track Bar */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-400 font-medium">Quick Track Top Assets:</div>
          <div className="flex flex-wrap gap-1.5">
            {PRELOAD_TICKERS.map((pt) => (
              <button
                key={pt.symbol}
                onClick={() => handleAdd(null, pt.symbol, pt.category)}
                className="text-xs bg-[#172036] hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 border border-slate-700/60 px-3 py-1 rounded-xl transition cursor-pointer"
              >
                + {pt.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Full-Width Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 w-full">
          
          {/* Watchlist Table (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            <form onSubmit={handleAdd} className="flex gap-3 bg-[#0f172a] p-3.5 rounded-2xl border border-slate-800">
              <input
                type="text"
                placeholder="Ticker (e.g. AAPL, NVDA)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-[#172036] border border-slate-700/60 px-4 py-2 rounded-xl text-white focus:outline-none focus:border-blue-500 flex-1 uppercase text-xs"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#172036] border border-slate-700/60 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs"
              >
                <option value="LARGE_CAP">Large Cap (&gt; 1.2%)</option>
                <option value="HIGH_BETA">High Beta (&gt; 3.0%)</option>
                <option value="STABLE">Stable / ETF (&gt; 0.75%)</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-semibold text-white transition text-xs cursor-pointer shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Adding...' : 'Add Stock'}
              </button>
            </form>

            {error && <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">{error}</div>}

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Watchlist Assets</h3>
                <span className="text-[10px] text-slate-500">{watchlist.length} Tickers Tracked</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131c31] text-slate-400 font-medium border-b border-slate-800/80">
                    <tr>
                      <th className="p-3.5 pl-5">Asset / Category</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5">Since Visit Baseline</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {watchlist.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                          No assets in watchlist. Click quick-track buttons above to populate.
                        </td>
                      </tr>
                    )}
                    {watchlist.map((item) => (
                      <tr key={item.id} className="hover:bg-[#131b2e]/60 transition">
                        
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{item.symbol}</span>
                            <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-slate-400 font-mono">
                              {item.category}
                            </span>
                          </div>
                        </td>

                        {/* Feature #2: Graceful Stale / Cached Price Indicator */}
                        <td className="p-3.5 font-mono text-slate-200">
                          <div className="flex flex-col">
                            <span>{item.price ? `$${item.price}` : 'Unavailable'}</span>
                            {item.is_stale && (
                              <span className="text-[9px] text-amber-400 font-sans italic">
                                Cached (Fallback)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono">
                          {item.has_baseline ? (
                            <span className={`font-bold ${
                              item.diff_since_last_visit > 0 ? 'text-emerald-400' : 
                              item.diff_since_last_visit < 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}>
                              {item.diff_since_last_visit > 0 ? '+' : ''}{item.diff_since_last_visit}%
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[10px]">No baseline</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {item.has_meaningful_change ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-semibold animate-pulse">
                              Meaningful Move
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Normal Variance</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSimulateMove(item.symbol, 3.5)}
                              className="text-[10px] bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-2 py-1 rounded-lg transition cursor-pointer"
                              title="Simulate a +3.5% Rally"
                            >
                              +3.5% Rally
                            </button>
                            <button
                              onClick={() => handleSimulateMove(item.symbol, -3.5)}
                              className="text-[10px] bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 px-2 py-1 rounded-lg transition cursor-pointer"
                              title="Simulate a -3.5% Drop"
                            >
                              -3.5% Drop
                            </button>
                            <button
                              onClick={() => handleDelete(item.symbol)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer font-bold text-xs ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Analytics Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Bar Chart mapping category colors via Cell children */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Delta Variance Report</h3>
                <span className="text-[10px] text-slate-400">Baseline Relative (%)</span>
              </div>

              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deltaReportData}>
                    <XAxis dataKey="symbol" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} unit="%" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                      {deltaReportData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Allocation Breakdown */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Asset Allocation Breakdown</h3>
                <span className="text-[10px] text-slate-400">Distribution</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryCounts}
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryCounts.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 text-xs flex-1 pl-4">
                  {categoryCounts.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                        {cat.name}
                      </span>
                      <span className="font-bold text-slate-200">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulation Explanatory Note */}
            <div className="bg-[#0f172a] border border-blue-900/50 p-4 rounded-2xl space-y-1.5 shadow-xl">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
                <span>Information Note: Testing Simulation Controls</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The <span className="text-emerald-400 font-medium">+3.5% Rally</span> and <span className="text-rose-400 font-medium">-3.5% Drop</span> action buttons are provided for demonstration purposes. They allow users to evaluate the volatility detection system and threshold alert triggers interactively, simulating market trend changes over long periods without waiting for real-time market shifts.
              </p>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}