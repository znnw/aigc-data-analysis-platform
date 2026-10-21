import SafeChart from '@/components/SafeChart';
import { APP_DESCRIPTION, APP_NAME } from '@/constants/brand';
import { listMyChartByPageUsingPOST } from '@/services/aigc/chartController';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  PieChartOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Button, Empty, Skeleton } from 'antd';
import React, { useEffect, useState } from 'react';

const statusMeta: Record<string, { label: string; className: string }> = {
  wait: { label: '等待中', className: 'is-waiting' },
  running: { label: '生成中', className: 'is-running' },
  succeed: { label: '已完成', className: 'is-success' },
  failed: { label: '失败', className: 'is-failed' },
};

const quickActions = [
  {
    title: '开始智能分析',
    description: '上传 Excel，直接生成图表与分析结论',
    icon: <ThunderboltOutlined />,
    path: '/add_chart',
    action: '立即分析',
  },
  {
    title: '创建异步任务',
    description: '提交耗时分析任务，继续处理其他工作',
    icon: <ClockCircleOutlined />,
    path: '/add_chart_async',
    action: '创建任务',
  },
  {
    title: '查看分析结果',
    description: '浏览历史图表、任务状态和完整结论',
    icon: <PieChartOutlined />,
    path: '/my_chart',
    action: '打开画廊',
  },
];

const formatTime = (value?: string) => {
  if (!value) {
    return '刚刚';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const Welcome: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<API.Chart[]>([]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await listMyChartByPageUsingPOST({
        current: 1,
        pageSize: 6,
        sortField: 'createTime',
        sortOrder: 'desc',
      });
      setTotal(Number(res.data?.total ?? 0));
      setRecords(res.data?.records ?? []);
    } catch {
      // The shared request layer displays the backend error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const recentSucceeded = records.filter((item) => item.status === 'succeed').length;
  const recentActive = records.filter(
    (item) => item.status === 'wait' || item.status === 'running',
  ).length;
  const latestRecord = records[0];
  const userName = initialState?.currentUser?.userName || '分析师';

  return (
    <PageContainer title={false} className="analysis-page workspace-page">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <span className="workspace-kicker">ANALYSIS COMMAND CENTER</span>
          <h1>你好，{userName}</h1>
          <p>{APP_DESCRIPTION}</p>
          <div className="workspace-hero-actions">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => history.push('/add_chart')}
            >
              新建分析
            </Button>
            <Button
              size="large"
              icon={<ClockCircleOutlined />}
              onClick={() => history.push('/add_chart_async')}
            >
              异步任务
            </Button>
          </div>
        </div>
        <div className="workspace-signal">
          <div className="workspace-signal-head">
            <span>最近分析流</span>
            <span className="live-indicator">
              <i />
              LIVE
            </span>
          </div>
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          ) : records.length ? (
            <div className="workspace-signal-list">
              {records.slice(0, 4).map((item, index) => {
                const meta = statusMeta[item.status || 'wait'] || statusMeta.wait;
                return (
                  <div className="workspace-signal-row" key={item.id}>
                    <span className="workspace-signal-index">0{index + 1}</span>
                    <span className="workspace-signal-name">{item.name || '未命名图表'}</span>
                    <span className={`status-pill ${meta.className}`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="workspace-signal-empty">
              <ExperimentOutlined />
              <span>还没有分析记录，从一份 Excel 开始。</span>
            </div>
          )}
          <div className="workspace-signal-footer">
            <span>{APP_NAME}</span>
            <span>
              {latestRecord ? `最近更新 ${formatTime(latestRecord.updateTime)}` : '等待首个任务'}
            </span>
          </div>
        </div>
      </section>

      <section className="workspace-metric-strip">
        <article className="workspace-metric">
          <span className="workspace-metric-icon">
            <DatabaseOutlined />
          </span>
          <div>
            <span className="workspace-metric-label">图表总数</span>
            <strong>{total}</strong>
          </div>
          <span className="workspace-metric-note">全部历史结果</span>
        </article>
        <article className="workspace-metric">
          <span className="workspace-metric-icon">
            <BarChartOutlined />
          </span>
          <div>
            <span className="workspace-metric-label">最近成功</span>
            <strong>{recentSucceeded}</strong>
          </div>
          <span className="workspace-metric-note">最近 {records.length} 条记录</span>
        </article>
        <article className="workspace-metric">
          <span className="workspace-metric-icon">
            <ClockCircleOutlined />
          </span>
          <div>
            <span className="workspace-metric-label">进行中</span>
            <strong>{recentActive}</strong>
          </div>
          <span className="workspace-metric-note">等待或生成中的任务</span>
        </article>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-head">
          <div>
            <span className="workspace-section-kicker">QUICK START</span>
            <h2>快速开始</h2>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadSummary} loading={loading}>
            刷新数据
          </Button>
        </div>
        <div className="quick-action-grid">
          {quickActions.map((item) => (
            <article
              className="quick-action-card"
              key={item.path}
              onClick={() => history.push(item.path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  history.push(item.path);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="quick-action-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="quick-action-link">
                {item.action}
                <ArrowRightOutlined />
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-head">
          <div>
            <span className="workspace-section-kicker">RECENT ANALYSIS</span>
            <h2>最近分析</h2>
          </div>
          <Button type="link" onClick={() => history.push('/my_chart')}>
            查看全部
            <ArrowRightOutlined />
          </Button>
        </div>
        {loading ? (
          <div className="workspace-recent-grid">
            {[1, 2, 3].map((item) => (
              <div className="workspace-recent-card" key={item}>
                <Skeleton active />
              </div>
            ))}
          </div>
        ) : records.length ? (
          <div className="workspace-recent-grid">
            {records.slice(0, 3).map((item) => {
              const meta = statusMeta[item.status || 'wait'] || statusMeta.wait;
              return (
                <article
                  className="workspace-recent-card"
                  key={item.id}
                  onClick={() => history.push('/my_chart')}
                >
                  <div className="workspace-recent-head">
                    <span className={`status-pill ${meta.className}`}>{meta.label}</span>
                    <span>{formatTime(item.createTime)}</span>
                  </div>
                  <h3>{item.name || '未命名图表'}</h3>
                  <p>{item.goal || '暂无分析目标'}</p>
                  <div className="workspace-recent-chart">
                    {item.status === 'succeed' ? (
                      <SafeChart optionSource={item.genChart} height={150} />
                    ) : (
                      <div className="workspace-recent-placeholder">
                        {item.status === 'failed' ? <PieChartOutlined /> : <ClockCircleOutlined />}
                        <span>{meta.label}</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无分析记录">
            <Button type="primary" onClick={() => history.push('/add_chart')}>
              创建第一个分析
            </Button>
          </Empty>
        )}
      </section>
    </PageContainer>
  );
};

export default Welcome;
