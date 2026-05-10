import React, { useEffect, useState } from 'react'
import remarkGfm from 'remark-gfm';
import './App.css'
import axios from 'axios'
import ReactMarkdown from 'react-markdown';
import TradingChart from './TradingChart';
import {
  Search,
  TrendingUp,
  Globe,
  ChevronRight,
  Zap,
  Activity,
  BarChart3,
  Newspaper,
  BrainCircuit,
  TerminalSquare,
  Database,
  X,
  Loader2 // Thêm icon loading xoay
} from 'lucide-react'

function App() {
  const [input, setInput] = useState('')
  const [allStocks, setAllStocks] = useState([])
  const [suggestions, setSuggestions] = useState([])

  const [loadingSymbols, setLoadingSymbols] = useState(false)
  const [loadingMarket, setLoadingMarket] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  
  const [showLogs, setShowLogs] = useState(false)
  const [fetchProgress, setFetchProgress] = useState(0)

  const [marketData, setMarketData] = useState(null)
  const [aiReport, setAiReport] = useState(null)
  const [logs, setLogs] = useState([])
  const [chartData, setChartData] = useState(null);
  const addLog = (msg) => {
    setLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev
    ].slice(0, 30))
  }

  // NẠP DANH SÁCH MÃ CHỨNG KHOÁN
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        setLoadingSymbols(true)
        addLog('Đang tải danh sách 1257 mã từ TradingView...')
        const response = await axios.get('http://localhost:3001/api/symbols')
        setAllStocks(response.data)
        addLog(`Hệ thống đã nạp xong ${response.data.length} mã. Sẵn sàng!`)
      } catch (err) {
        addLog('Lỗi kết nối Backend. Vui lòng kiểm tra server.js.')
      }
      setLoadingSymbols(false)
    }
    loadSymbols()
  }, [])

  // GỢI Ý TÌM KIẾM
  useEffect(() => {
    if (!input.trim() || loadingMarket) {
      setSuggestions([])
      return
    }
    const keyword = input.toUpperCase()
    const filtered = allStocks
      .filter(stock => stock.symbol.startsWith(keyword))
      .slice(0, 8)
    setSuggestions(filtered)
  }, [input, allStocks, loadingMarket])

  // LẤY DỮ LIỆU THÔ
  const fetchMarketData = async () => {

    setChartData(null)
    if (!input) return

    setSuggestions([])
    setLoadingMarket(true)
    setAiReport(null)
    setMarketData(null)
    setFetchProgress(10)

    addLog(`Đang khởi tạo lệnh quét thị trường cho mã: ${input}`)

    try {
      setFetchProgress(30)
      
      // GỌI SONG SONG 2 API: Lấy dữ liệu và Lấy biểu đồ
      const [marketRes, historyRes] = await Promise.all([
         axios.get(`http://localhost:3001/api/fetch/${input}`),
         axios.get(`http://localhost:3001/api/history/${input}`).catch(() => ({ data: null }))
      ]);      
      
      // Lấy dữ liệu công ty từ marketRes (SỬA LỖI Ở ĐÂY)
      const fullData = marketRes.data.data;

      // Nạp dữ liệu biểu đồ
      if (historyRes.data && historyRes.data.length > 0) {
         setChartData(historyRes.data); // Có data thì vẽ
      } else {
         setChartData(null); // Không có data thì ẩn khung biểu đồ
      }
      
      setMarketData({ ...fullData, deepNewsData: [] })
      setFetchProgress(50)

      // Bước 2: In từng tin tức ra (Simulation của việc cào dữ liệu thực tế)
      for (let i = 0; i < fullData.deepNewsData.length; i++) {
        // Đợi một khoảng ngắn để tạo hiệu ứng "in tới đâu hiện tới đó"
        await new Promise(r => setTimeout(r, 400)) 
        
        setMarketData(prev => ({
          ...prev,
          deepNewsData: [...prev.deepNewsData, fullData.deepNewsData[i]]
        }))
        
        // Cập nhật % loading dựa trên số lượng tin
        const currentPercent = 50 + Math.round(((i + 1) / fullData.deepNewsData.length) * 50)
        setFetchProgress(currentPercent)
        addLog(`Đã nạp xong nguồn tin ${i + 1}/${fullData.deepNewsData.length}`)
      }

    } catch (err) {
      addLog(`Lỗi fetch market data cho mã ${input}.`)
      console.error(err) // In lỗi ra console để dễ bắt bệnh nếu còn
    }

    setTimeout(() => {
      setLoadingMarket(false)
      setFetchProgress(0)
    }, 500)
  }
const handleAiAnalysis = async () => {
    if (!marketData) return
    setAnalyzing(true)
    addLog(`Đang bơm dữ liệu thô vào lõi AI (Gemini Flash)...`)
    
    try {
      const response = await axios.post(
        `http://localhost:3001/api/analyze/${marketData.stockInfo.symbol}`,
        marketData 
      )    
      setAiReport(response.data.aiReport)
      addLog(`OMNI DUCK hoàn tất xuất báo cáo chiến lược.`)
      setShowLogs(false) // Đóng log để đại ca nhìn báo cáo cho rõ
    } catch (err) {
      addLog('Lỗi kết nối Gemini AI. Kiểm tra API Key hoặc Server Backend.')
      console.error(err)
    }
    setAnalyzing(false)
  }
  return (
    <div className="w-full min-h-screen bg-[#06080B] text-white flex flex-col overflow-hidden font-sans">

      {/* HEADER: TRÀN TOÀN MÀN HÌNH */}
      <header className="relative z-[100] border-b border-white/5 bg-[#0B0F14]/90 backdrop-blur-xl px-8 py-5 flex items-center justify-between shrink-0 w-full">
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center text-black font-black shadow-lg shadow-yellow-400/20">
      <TrendingUp size={24} />
    </div>
    <div>
      <h1 className="text-2xl font-black tracking-tight text-white">
        OMNI <span className="text-yellow-400 italic">DUCK</span>
      </h1>
      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mt-1">Quantitative Terminal</p>
    </div>
  </div>

  {/* THANH TÌM KIẾM - ĐÃ FIX LỖI DROPLIST */}
  <div className="relative flex-1 max-w-4xl mx-10">
    <div className="flex items-center h-14 bg-[#121821] border border-white/10 rounded-2xl px-4 focus-within:border-yellow-400/50 transition-all shadow-inner">
      <Search size={20} className="text-yellow-400 mr-3" />
      <input
        type="text"
        placeholder="Gõ mã cổ phiếu (VD: MBB, TCB, HPG...)"
        className="flex-1 bg-transparent outline-none text-lg font-bold text-white placeholder:text-slate-600 uppercase"
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && fetchMarketData()}
        disabled={loadingMarket}
      />
      <button
        onClick={fetchMarketData}
        disabled={loadingMarket || !input}
        className="h-10 px-8 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm transition-all active:scale-95 disabled:opacity-50"
      >
        TÌM KIẾM
      </button>
    </div>

    {/* DROPLIST GỢI Ý - BẮT BUỘC PHẢI CÓ ĐOẠN NÀY */}
    {suggestions.length > 0 && (
      <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#10151C] border border-white/10 rounded-2xl overflow-hidden z-[999] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {suggestions.map(stock => (
          <button
            key={stock.symbol}
            onClick={() => {
              setInput(stock.symbol);
              setSuggestions([]);
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-yellow-400/10 transition-all border-b border-white/5 text-left group"
          >
            <div>
              <p className="text-white font-black text-lg group-hover:text-yellow-400 transition-colors">
                {stock.symbol}
              </p>
              <p className="text-slate-500 text-xs mt-1 truncate max-w-[400px]">
                {stock.name}
              </p>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase bg-white/5 px-2 py-1 rounded">
              {stock.exchange}
            </span>
          </button>
        ))}
      </div>
    )}
  </div>

  <button 
    onClick={() => setShowLogs(!showLogs)}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showLogs ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg' : 'bg-[#121821] text-slate-400 border-white/10 hover:text-white'}`}
  >
    <TerminalSquare size={18} />
    {showLogs ? 'ĐÓNG LOGS' : 'SYSTEM LOGS'}
  </button>
</header>

      <div className="flex-1 overflow-hidden flex relative w-full">

        {/* CỘT TRÁI: DÂN CHƠI HỆ DỮ LIỆU */}
        <div className="w-[450px] border-r border-white/5 bg-[#080C11] flex flex-col shrink-0">
          
          {/* THANH LOADING CHUYỂN VỀ ĐỈNH CỘT TRÁI */}
          <div className="h-1 w-full bg-white/5 overflow-hidden">
            {loadingMarket && (
              <div 
                className="h-full bg-yellow-400 transition-all duration-300 shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                style={{ width: `${fetchProgress}%` }} 
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {marketData ? (
  <>
    {/* THẺ DỮ LIỆU TỔNG QUAN */}
    <div className="bg-[#10151C] border border-white/5 rounded-3xl p-6 shadow-xl animate-in slide-in-from-left-4">
      {/* PHẦN 1: MÃ CỔ PHIẾU & GIÁ BIẾN ĐỘNG */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1">Mã Cổ Phiếu</p>
          <h2 className="text-5xl font-black tracking-tighter text-white">{marketData.stockInfo.symbol}</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-1 leading-tight max-w-[180px]">
            {marketData.companyProfile.fullName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1">Giá Khớp Lệnh</p>
          <h2 className="text-3xl font-black text-white">{marketData.stockInfo.currentPrice}</h2>
          
          {/* LOGIC BIẾN ĐỔI MÀU XANH/ĐỎ THEO BIẾN ĐỘNG */}
          <div className={`flex items-center justify-end gap-1 font-black text-sm mt-1 ${
            (marketData.stockInfo.change || 0) >= 0 ? 'text-emerald-400' : 'text-red-500'
          }`}>
            {(marketData.stockInfo.change || 0) >= 0 ? '▲' : '▼'}

            <span>
{Number(marketData.stockInfo.change || 0).toFixed(0)} 
    ({Number(marketData.stockInfo.changePercent || 0).toFixed(2)}%)
                  </span>
          </div>
        </div>
      </div>

      {/* PHẦN 2: CHỈ SỐ CƠ BẢN (VỐN, P/E, NGÀY TL) */}
      <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5 my-6">
        <div className="text-center">
          <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Vốn hóa</p>
          <p className="text-xs font-black text-white">{marketData.companyProfile.marketCap || '---'}</p>
        </div>
        <div className="text-center border-x border-white/5">
          <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">P/E</p>
          <p className="text-xs font-black text-white">{marketData.companyProfile.peRatio || '---'}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Ngày TL</p>
          <p className="text-xs font-black text-white">{marketData.companyProfile.establishedDate || '---'}</p>
        </div>
      </div>

      {/* PHẦN 3: TỔNG QUAN DOANH NGHIỆP */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-yellow-400/70 font-black mb-2 flex items-center gap-2">
          <Activity size={12} /> Tổng quan doanh nghiệp
        </p>
        <p className="text-slate-400 text-[11px] leading-relaxed italic line-clamp-4">
          {marketData.companyProfile.overview}
        </p>
      </div>

      <button
        onClick={handleAiAnalysis}
        disabled={analyzing}
        className="w-full h-14 rounded-2xl bg-white hover:bg-yellow-400 text-black font-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <BrainCircuit size={20} />
        {analyzing ? 'AI ĐANG TƯ DUY...' : 'PHÂN TÍCH VỚI OMNI DUCK'}
      </button>
    </div>
    

                {/* Danh sách tin tức hiện ra tức thì */}
                <div className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black px-2">Live News Stream</h3>
                  {marketData.deepNewsData.map((news, index) => (
                    <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-[#10151C] border border-white/5 rounded-2xl p-4">
                      <h3 className="text-slate-300 font-bold text-sm leading-snug">{news.title}</h3>
                      <div className="mt-2 flex justify-between items-center">
                         <span className="text-[9px] text-slate-600 font-black">SOURCE {index + 1}</span>
                         <Globe size={12} className="text-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50">
                <Database size={48} className="mb-4" />
                <p className="text-xs font-black uppercase">Waiting for Command</p>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI */}
        {marketData && chartData && (
            <div className="mb-8 bg-[#10151C] border border-white/5 rounded-[40px] p-8 shadow-2xl animate-in fade-in zoom-in">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <BarChart3 className="text-yellow-400" size={24} />
                <h3 className="text-white font-black tracking-widest uppercase text-lg">Biểu đồ Kỹ thuật</h3>
              </div>
              <TradingChart data={chartData} />
            </div>
          )}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-[#05080C] relative">
          {showLogs && (
            <div className="absolute top-4 right-8 w-96 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between bg-white/5 px-4 py-3 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terminal Output</span>
                <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white"><X size={16}/></button>
              </div>
              <div className="p-4 h-64 overflow-y-auto font-mono text-[11px] text-emerald-400/80 leading-relaxed space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="border-b border-white/5 pb-1 last:border-0">{log}</div>
                ))}
              </div>
            </div>
          )}

          {!marketData && !analyzing && !aiReport && (
            <div className="h-full rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-slate-700">
              <BarChart3 size={80} className="mb-6 opacity-10" />
              <p className="uppercase tracking-[0.3em] text-[10px] font-black opacity-30">Hệ thống đang chờ lệnh</p>
            </div>
          )}

          {analyzing && (
            <div className="h-full rounded-[40px] bg-[#10151C] border border-white/5 flex flex-col items-center justify-center shadow-2xl">
              <div className="w-16 h-16 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin mb-8" />
              <h2 className="text-yellow-400 font-black text-sm tracking-[0.3em] uppercase animate-pulse">OMNI DUCK ĐANG TƯ DUY...</h2>
            </div>
          )}

          {aiReport && (
  <div className="max-w-4xl mx-auto bg-[#10151C] border border-yellow-400/20 rounded-[40px] p-10 shadow-2xl animate-in fade-in zoom-in duration-500">
    <div className="flex items-center gap-5 mb-10 pb-8 border-b border-white/5">
      <div className="w-16 h-16 rounded-3xl bg-yellow-400 text-black flex items-center justify-center shadow-xl shadow-yellow-400/20 shrink-0">
        <Zap size={28} />
      </div>
      <div>
        <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase">Strategic Intelligence</h2>
        <p className="text-yellow-400 uppercase tracking-[0.3em] text-[10px] font-black mt-2">Omni Duck AI Framework</p>
      </div>
    </div>

    {/* BỘ DỊCH MARKDOWN THẦN THÁNH */}
    <div className="prose prose-invert max-w-none 
      prose-headings:text-yellow-400 prose-headings:font-black prose-headings:italic prose-headings:uppercase
      prose-p:text-slate-300 prose-p:leading-loose prose-p:text-[16px]
      prose-strong:text-emerald-400 prose-strong:font-black
      prose-ul:list-disc prose-ul:pl-5
      prose-li:text-slate-300 prose-li:mb-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
  {aiReport}
</ReactMarkdown>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  )
}

export default App