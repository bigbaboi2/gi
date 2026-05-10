import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';

const SYMBOLS_FILE = path.join(process.cwd(), 'data', 'symbols_database.json');

// Kế hoạch B (Chỉ dùng khi mất mạng hoàn toàn)
const FALLBACK_STOCKS = [
    { symbol: 'MBB', name: 'Ngân hàng TMCP Quân đội', exchange: 'HOSE' },
    { symbol: 'SSI', name: 'CTCP Chứng khoán SSI', exchange: 'HOSE' },
    { symbol: 'FPT', name: 'CTCP FPT', exchange: 'HOSE' },
    { symbol: 'HPG', name: 'CTCP Tập đoàn Hòa Phát', exchange: 'HOSE' },
    { symbol: 'VIC', name: 'Tập đoàn Vingroup', exchange: 'HOSE' }
];

export async function updateSymbolsDatabase() {
    console.log(chalk.cyan('\n[OMNI DUCK QUANT] Các trạm nội địa đóng cửa. Kích hoạt vệ tinh quét dữ liệu toàn cầu (TradingView)...'));

    try {
        if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
            fs.mkdirSync(path.join(process.cwd(), 'data'));
        }

        // Bắn tín hiệu POST lên máy chủ TradingView để lấy trọn gói thị trường Việt Nam
        const response = await axios.post('https://scanner.tradingview.com/vietnam/scan', {
            "columns": ["name", "description", "exchange"], // Lấy Mã, Tên công ty, Sàn
            "range": [0, 2000], // Quét một phát 2000 mã (đủ bao trọn 3 sàn VN)
            "sort": { "sortBy": "name", "sortOrder": "asc" }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000 // Chờ 10 giây
        });

        // TradingView trả về dữ liệu nằm trong mảng data, mỗi item có mảng 'd' chứa các cột
        if (response.data && response.data.data) {
            const allStocks = response.data.data
                .map(item => ({
                    symbol: item.d[0], // Cột 1: Mã (VD: MBB)
                    name: item.d[1],   // Cột 2: Tên (VD: MILITARY COMMERCIAL JOINT STOCK BANK)
                    exchange: item.d[2] // Cột 3: Sàn (VD: HOSE)
                }))
                .filter(s => s.symbol && s.symbol.length === 3); // Lọc sạch: Chỉ lấy mã cổ phiếu 3 chữ cái

            // Lưu chiến lợi phẩm
            fs.writeFileSync(SYMBOLS_FILE, JSON.stringify(allStocks, null, 2));
            console.log(chalk.green(`✔ VỆ TINH KẾT NỐI: Đã nạp ${allStocks.length} mã chứng khoán từ TradingView.`));
            
            return allStocks;
        } else {
            throw new Error("TradingView không trả về dữ liệu.");
        }

    } catch (error) {
        console.log(chalk.bgRed.white.bold(`\n ✘ LỖI VỆ TINH TRADINGVIEW: ${error.message} `));
        console.log(chalk.yellow(`⚠ Kích hoạt Database dự phòng...`));
        
        // Đọc lại file cũ nếu có, không có thì xài mảng tĩnh
        if (fs.existsSync(SYMBOLS_FILE)) {
            return JSON.parse(fs.readFileSync(SYMBOLS_FILE));
        } else {
            fs.writeFileSync(SYMBOLS_FILE, JSON.stringify(FALLBACK_STOCKS, null, 2));
            return FALLBACK_STOCKS;
        }
    }
}