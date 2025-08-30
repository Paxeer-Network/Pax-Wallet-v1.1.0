import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MobileTradingChartProps {
  symbol?: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const MobileTradingChart: React.FC<MobileTradingChartProps> = ({ symbol = 'BTC/USDC' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol.replace('/', ''),
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#1a1a1a',
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_legend: true,
          hide_side_toolbar: true,
          hide_bottom_toolbar: true,
          save_image: false,
          container_id: containerRef.current.id,
          height: 250,
          disabled_features: [
            'left_toolbar',
            'header_widget',
            'timeframes_toolbar',
            'volume_force_overlay',
            'create_volume_indicator_by_default',
            'study_templates'
          ],
          enabled_features: [
            'hide_left_toolbar_by_default'
          ],
          studies: [],
          overrides: {
            'paneProperties.background': '#1a1a1a',
            'paneProperties.vertGridProperties.color': '#2a2a2a',
            'paneProperties.horzGridProperties.color': '#2a2a2a',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': '#ffffff',
            'mainSeriesProperties.candleStyle.upColor': '#22c55e',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#22c55e',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#22c55e',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
          }
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [symbol]);

  const chartId = `mobile-chart-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Card className="bg-card-bg border-card-bg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm">{symbol}</h3>
          <div className="flex items-center space-x-2 text-xs text-white/60">
            <span>15m</span>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Live</span>
          </div>
        </div>
        <div 
          id={chartId}
          ref={containerRef}
          className="w-full h-56 bg-black/20 rounded-lg overflow-hidden"
        />
      </CardContent>
    </Card>
  );
};

export default MobileTradingChart;
