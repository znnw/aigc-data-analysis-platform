import { parseVisibleChartOption } from '@/utils/chart';
import { Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import React from 'react';

type ChartBoundaryProps = {
  children: React.ReactNode;
  fallbackText?: string;
};

type ChartBoundaryState = {
  failed: boolean;
};

class ChartBoundary extends React.Component<ChartBoundaryProps, ChartBoundaryState> {
  state: ChartBoundaryState = {
    failed: false,
  };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('图表渲染失败', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <Empty
          className="safe-chart-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={this.props.fallbackText || '图表数据异常，暂时无法展示'}
        />
      );
    }
    return this.props.children;
  }
}

type SafeChartProps = {
  option?: Record<string, any>;
  optionSource?: string | null;
  height?: number;
  className?: string;
  emptyText?: string;
  chartRef?: React.Ref<ReactECharts>;
};

const SafeChart: React.FC<SafeChartProps> = ({
  option,
  optionSource,
  height = 320,
  className,
  emptyText,
  chartRef,
}) => {
  const resolvedOption = option ?? parseVisibleChartOption(optionSource);

  if (!resolvedOption) {
    return (
      <Empty
        className="safe-chart-empty"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyText || '暂无图表'}
      />
    );
  }

  return (
    <ChartBoundary fallbackText={emptyText}>
      <ReactECharts
        ref={chartRef}
        className={className}
        option={resolvedOption}
        notMerge
        lazyUpdate
        style={{ height }}
      />
    </ChartBoundary>
  );
};

export default SafeChart;
