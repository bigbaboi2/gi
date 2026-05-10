import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Import các công cụ cào dữ liệu và dịch vụ đã viết
import { getVnStockData } from './fetchers/vnStockFetcher.js';
import { getCompanyProfile } from './fetchers/companyProfileFetcher.js';
import { searchVnNewsDirectly } from './scrapers/vnNewsSearch.js';
import { scrapeArticleContent } from './scrapers/contentScraper.js';
import { getCachedData, saveToCache } from './services/cacheService.js';
import { analyzeWithGemini } from './services/aiService.js';
import { updateSymbolsDatabase } from './services/symbolUpdater.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Đường dẫn tới Database mã chứng khoán nội bộ
const SYMBOLS_FILE = path.join(process.cwd(), 'data', 'symbols_database.json');

/* ======================================================
   1. API LẤY DANH SÁCH MÃ (Đọc từ Database nội bộ)
====================================================== */
app.get('/api/symbols', async (req, res) => {
    try {
        if (!fs.existsSync(SYMBOLS_FILE)) {
            console.log(chalk.yellow('[SYMBOLS] Database chưa tồn tại. Đang khởi tạo...'));
            const freshData = await updateSymbolsDatabase();
            return res.json(freshData);
        }

        const rawData = fs.readFileSync(SYMBOLS_FILE);
        const stocks = JSON.parse(rawData);
        console.log(chalk.green(`[API] Đã nạp ${stocks.length} mã từ database nội bộ.`));
        res.json(stocks);
    } catch (error) {
        console.log(chalk.red(`[SYMBOL ERROR] ${error.message}`));
        res.status(500).json({ success: false, message: "Lỗi đọc danh sách mã." });
    }
});

/* ======================================================
   2. API LẤY DỮ LIỆU THỊ TRƯỜNG (Step 1: Fetch Raw Data)
====================================================== */
app.get('/api/fetch/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    console.log(chalk.blue(`\n[FETCH] Đang thu thập dữ liệu thô cho mã: ${ticker}`));

    try {
        // Kiểm tra kho lưu trữ (Cache) trước
        let fullData = await getCachedData(ticker);

        if (!fullData) {
            console.log(chalk.yellow(`[CACHE MISS] Đang cào dữ liệu mới cho ${ticker}...`));

            // Lấy Giá và Hồ sơ doanh nghiệp
            const [stockInfo, companyProfile] = await Promise.all([
                getVnStockData(ticker),
                getCompanyProfile(ticker)
            ]);

            // Quét tin tức liên quan
            const newsLinks = await searchVnNewsDirectly(ticker);
            let deepNewsData = [];

            if (newsLinks.length > 0) {
                // Lấy tối đa 6 bài tin tức chi tiết để làm dữ liệu thô
                for (let i = 0; i < newsLinks.length && deepNewsData.length < 10; i++) {
                    const content = await scrapeArticleContent(newsLinks[i].link);
                    if (content && content.length > 50) {
                        deepNewsData.push({
                            title: newsLinks[i].title,
                            source: newsLinks[i].link,
                            content: content
                        });
                    }
                }
            }

            fullData = { stockInfo, companyProfile, deepNewsData };
            
            // Lưu vào kho để lần sau không phải cào lại
            await saveToCache(ticker, fullData);
        }

        res.json({ success: true, ticker, data: fullData });

    } catch (error) {
        console.log(chalk.red(`[FETCH ERROR] ${error.message}`));
        res.status(500).json({ success: false, message: error.message });
    }
});

/* ======================================================
   3. API PHÂN TÍCH CHIẾN LƯỢC (Step 2: Gemini AI)
====================================================== */
app.post('/api/analyze/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const fullData = req.body; // Nhận dữ liệu thô từ Frontend gửi lên

    console.log(chalk.magenta(`\n[AI ANALYSIS] Đang đẩy dữ liệu mã ${ticker} lên OMNI DUCK...`));

    try {
        if (!fullData || !fullData.stockInfo) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu thị trường để phân tích.' });
        }

        const aiReport = await analyzeWithGemini(ticker, fullData);

        res.json({ success: true, aiReport });
    } catch (error) {
        console.log(chalk.red(`[AI ERROR] ${error.message}`));
        res.status(500).json({ success: false, message: error.message });
    }
});
// ==========================================
// API: LẤY LỊCH SỬ GIÁ VẼ BIỂU ĐỒ (NGUỒN TCBS)
// ==========================================
app.get('/api/history/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const to = Math.floor(Date.now() / 1000);
    const from = to - (365 * 24 * 60 * 60); 

    try {
        const url = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        
        if (response.data && response.data.data) {
            // Định dạng lại data cho chuẩn TradingView
            const chartData = response.data.data.map(item => ({
                time: item.tradingDate.split('T')[0], // Cắt lấy ngày YYYY-MM-DD
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                value: item.volume // Dùng cho biểu đồ cột khối lượng
            }));
            
            // TradingView bắt buộc dữ liệu phải đi từ cũ đến mới (Ascending)
            // TCBS trả về mới đến cũ, nên phải đảo ngược mảng (reverse)
            res.json(chartData.reverse());
        } else {
            res.status(404).json({ error: "Không có dữ liệu lịch sử" });
        }
    } catch (error) {
        console.error("Lỗi lấy lịch sử:", error.message);
        res.status(500).json({ error: "Lỗi Server" });
    }
});

/* ======================================================
   KHỞI CHẠY SERVER
====================================================== */
app.listen(PORT, async () => {
    console.log(chalk.bgGreen.black.bold(`\n 🚀 OMNI DUCK SERVER READY: http://localhost:${PORT} `));
    
    // Tự động cập nhật Database mã chứng khoán khi khởi động để đảm bảo dữ liệu mới nhất
    await updateSymbolsDatabase();
});