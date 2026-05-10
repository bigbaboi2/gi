import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import chalk from 'chalk';

// --- ĐOẠN KIỂM TRA KEY (CHÈN VÀO ĐÂY) ---
console.log(chalk.blue('\n--- [DEBUG] KIỂM TRA CẤU HÌNH AI ---'));
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.log(chalk.bgRed.white.bold(' ✘ LỖI CHÍ MẠNG: Biến GEMINI_API_KEY đang trống rỗng! '));
    console.log(chalk.yellow('👉 Đại ca kiểm tra lại file .env đã đặt đúng thư mục gốc chưa?'));
} else {
    console.log(chalk.green('✔ Đã tìm thấy API Key trong bộ nhớ.'));
    console.log(chalk.gray(`Mã khởi đầu: ${apiKey.substring(0, 6)}...`)); // Chỉ hiện 6 ký tự đầu cho an toàn
    console.log(chalk.gray(`Độ dài mã: ${apiKey.length} ký tự`));
}
console.log(chalk.blue('-----------------------------------\n'));


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function analyzeWithGemini(ticker, data) {
    console.log(chalk.yellow('\n🤖 Gemini AI đang đọc dữ liệu và suy nghĩ...'));
    
    // Sử dụng model flash vì nó cực nhanh và rẻ
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    // Rút gọn tin tức để không bị vượt quá giới hạn chữ của AI
    const newsSummary = data.deepNewsData.map((news, i) => {
        return `Bài ${i + 1} - ${news.title}\nNội dung chính: ${news.content.substring(0, 800)}...`;
    }).join('\n\n');

    // MỘT PROMPT CHUYÊN NGHIỆP QUYẾT ĐỊNH 90% ĐỘ THÔNG MINH CỦA AI
    const prompt = `
Bạn là một Giám đốc phân tích định lượng (Quant Analyst) xuất sắc tại thị trường chứng khoán Việt Nam.
Nhiệm vụ của bạn là phân tích mã cổ phiếu: ${ticker.toUpperCase()}

DỮ LIỆU ĐẦU VÀO TỪ HỆ THỐNG:
1. Thông tin doanh nghiệp: Tên: ${data.companyProfile.fullName} | Ngành nghề: ${data.companyProfile.industry}
2. Cốt lõi kinh doanh: ${data.companyProfile.overview}
3. Giá giao dịch hiện tại: ${data.stockInfo.currentPrice} VNĐ
4. Tổng hợp tin tức và dư luận mới nhất:
${newsSummary}

YÊU CẦU TRÌNH BÀY BÁO CÁO (Trình bày bằng tiếng Việt, dùng Markdown, văn phong sắc bén, khách quan):
1. Tóm tắt thời sự (Executive Summary): Các sự kiện trọng yếu nào đang bủa vây doanh nghiệp này dựa trên tin tức?
2. Phân tích Tác động: Những tin tức này ảnh hưởng TÍCH CỰC, TIÊU CỰC hay TRUNG LẬP đến giá trị cốt lõi của doanh nghiệp? Tại sao?
3. Cảnh báo rủi ro (Risk Warning): Có dấu hiệu thao túng, tin đồn thất thiệt, hay rủi ro ngành nào cần lưu ý không?
4. Khuyến nghị ngắn hạn: Dựa trên dữ liệu (không đoán mò), xu hướng tâm lý đám đông đang đổ về hướng nào? (Mua, Bán, hay Nắm giữ).
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error(chalk.red("\n❌ Lỗi khi kết nối với Gemini AI:"), error.message);
        return null;
    }
}