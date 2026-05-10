import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function TradingChart({ data }) {
    const chartContainerRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        // Khởi tạo khung vẽ biểu đồ
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#94a3b8', // Màu chữ slate-400
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            crosshair: {
                mode: 0, // Chế độ nam châm dính vào nến
            },
        });

        // Khởi tạo Biểu đồ Nến (Candlestick)
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10b981', // Xanh lá
            downColor: '#ef4444', // Đỏ
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        candlestickSeries.setData(data);
        chart.timeScale().fitContent(); // Tự động zoom cho vừa khung hình

        // Tự động resize khi đổi kích thước màn hình
        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        // Dọn dẹp khi tắt Component
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    return <div ref={chartContainerRef} className="w-full h-[400px]" />;
}