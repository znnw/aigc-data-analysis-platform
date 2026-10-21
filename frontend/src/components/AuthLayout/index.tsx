import Footer from '@/components/Footer';
import { APP_AUTHOR, APP_DESCRIPTION, APP_LOGO, APP_NAME } from '@/constants/brand';
import { Link } from '@umijs/max';
import ReactECharts from 'echarts-for-react';
import React from 'react';

const liveChartOption = {
  animationDuration: 1400,
  animationEasing: 'cubicOut',
  grid: { left: 0, right: 0, top: 18, bottom: 0 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.14)' } },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.42)', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    splitNumber: 3,
    axisLabel: { show: false },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(16,20,24,0.92)',
    borderColor: 'rgba(255,255,255,0.12)',
    textStyle: { color: '#fff', fontSize: 12 },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: false,
      data: [18, 26, 24, 42, 38, 56, 68],
      lineStyle: { width: 2, color: '#35d3bd' },
      itemStyle: { color: '#35d3bd' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(53,211,189,0.32)' },
            { offset: 1, color: 'rgba(53,211,189,0)' },
          ],
        },
      },
    },
  ],
};

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auth-page">
    <section className="auth-brand-panel">
      <Link className="auth-brand" to="/user/login" aria-label={APP_NAME}>
        <img src={APP_LOGO} alt="" />
        <span>{APP_NAME}</span>
      </Link>
      <div className="auth-brand-copy">
        <span className="auth-brand-kicker">AI DATA ANALYSIS</span>
        <h1>让数据成为决策依据</h1>
        <p>{APP_DESCRIPTION}</p>
        <div className="auth-live-panel">
          <div className="auth-live-heading">
            <span>分析吞吐</span>
            <strong>+28.4%</strong>
          </div>
          <ReactECharts
            option={liveChartOption}
            style={{ height: 150 }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
      <div className="auth-brand-footer">Designed & developed by {APP_AUTHOR}</div>
    </section>
    <main className="auth-form-panel">
      <div className="auth-form-content">{children}</div>
      <Footer />
    </main>
  </div>
);

export default AuthLayout;
