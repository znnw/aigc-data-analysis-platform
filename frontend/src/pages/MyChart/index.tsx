import SafeChart from '@/components/SafeChart';
import { listMyChartByPageUsingPOST } from '@/services/aigc/chartController';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  PieChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Empty,
  List,
  Result,
  Skeleton,
  Tag,
} from 'antd';
import Search from 'antd/es/input/Search';
import React, { useEffect, useState } from 'react';

const initSearchParams = {
  current: 1,
  pageSize: 6,
  sortField: 'createTime',
  sortOrder: 'desc',
};

const statusMeta: Record<string, { label: string; className: string }> = {
  wait: { label: '等待中', className: 'is-waiting' },
  running: { label: '生成中', className: 'is-running' },
  succeed: { label: '已完成', className: 'is-success' },
  failed: { label: '失败', className: 'is-failed' },
};

const formatTime = (value?: string) => {
  if (!value) {
    return '暂无时间';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const ChartStatus: React.FC<{ status?: string }> = ({ status }) => {
  const meta = statusMeta[status || 'wait'] || statusMeta.wait;
  return <span className={`status-pill ${meta.className}`}>{meta.label}</span>;
};

const MyChartPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState<API.ChartQueryRequest>({ ...initSearchParams });
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState ?? {};
  const [chartList, setChartList] = useState<API.Chart[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<API.Chart>();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listMyChartByPageUsingPOST(searchParams);
      setChartList(res.data?.records ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch {
      // The shared request layer displays the backend error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchParams]);

  return (
    <PageContainer title={false} className="analysis-page chart-gallery-page">
      <div className="chart-gallery-head">
        <div>
          <span className="workspace-kicker">ANALYSIS LIBRARY</span>
          <h1>我的图表</h1>
          <p>集中浏览历史分析、图表状态和完整结论。</p>
        </div>
        <div className="chart-gallery-summary">
          <PieChartOutlined />
          <div>
            <span>累计结果</span>
            <strong>{total}</strong>
          </div>
        </div>
      </div>

      <div className="chart-gallery-toolbar">
        <Search
          className="chart-search"
          placeholder="搜索图表名称"
          enterButton
          loading={loading}
          onSearch={(value) => {
            setSearchParams({
              ...initSearchParams,
              name: value.trim(),
            });
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      <List
        grid={{
          gutter: 18,
          xs: 1,
          sm: 1,
          md: 1,
          lg: 2,
          xl: 2,
          xxl: 3,
        }}
        pagination={
          total > 0
            ? {
                onChange: (page, pageSize) => {
                  setSearchParams({
                    ...searchParams,
                    current: page,
                    pageSize,
                  });
                },
                current: Number(searchParams.current),
                pageSize: Number(searchParams.pageSize),
                total,
                showSizeChanger: true,
                pageSizeOptions: [6, 12, 18],
              }
            : false
        }
        loading={loading && !chartList.length}
        dataSource={chartList}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分析结果" />
          ),
        }}
        renderItem={(item) => (
          <List.Item key={item.id}>
            <Card
              hoverable
              className="chart-gallery-card"
              onClick={() => setSelectedChart(item)}
            >
              <div className="chart-gallery-card-head">
                <ChartStatus status={item.status} />
                <span>{formatTime(item.createTime)}</span>
              </div>
              <h3>{item.name || '未命名图表'}</h3>
              <p className="chart-gallery-goal">{item.goal || '暂无分析目标'}</p>
              <div className="chart-gallery-preview">
                {loading ? (
                  <Skeleton active paragraph={{ rows: 3 }} title={false} />
                ) : item.status === 'succeed' ? (
                  <SafeChart optionSource={item.genChart} height={210} />
                ) : (
                  <div className={`chart-status-stage ${statusMeta[item.status || 'wait']?.className}`}>
                    {item.status === 'failed' ? (
                      <Result
                        status="error"
                        title="生成失败"
                        subTitle={item.execMessage || '暂无失败详情'}
                      />
                    ) : (
                      <>
                        <ClockCircleOutlined />
                        <strong>{statusMeta[item.status || 'wait']?.label || '等待中'}</strong>
                        <span>{item.execMessage || '任务正在处理中'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="chart-gallery-card-footer">
                <span>
                  <Avatar size={22} src={currentUser?.userAvatar}>
                    {currentUser?.userName?.slice(0, 1)}
                  </Avatar>
                  {currentUser?.userName || '当前用户'}
                </span>
                <Button type="link" size="small">
                  查看详情
                  <ArrowRightOutlined />
                </Button>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Drawer
        width="min(760px, 92vw)"
        open={Boolean(selectedChart)}
        onClose={() => setSelectedChart(undefined)}
        title={selectedChart?.name || '分析详情'}
        closeIcon={<CloseOutlined />}
        className="chart-detail-drawer"
      >
        {selectedChart ? (
          <div className="chart-detail-content">
            <div className="chart-detail-meta">
              <ChartStatus status={selectedChart.status} />
              {selectedChart.chartType ? <Tag>{selectedChart.chartType}</Tag> : null}
              <span>{formatTime(selectedChart.createTime)}</span>
            </div>
            <section>
              <span className="chart-detail-label">分析目标</span>
              <p>{selectedChart.goal || '暂无分析目标'}</p>
            </section>
            <section>
              <span className="chart-detail-label">可视化图表</span>
              {selectedChart.status === 'succeed' ? (
                <SafeChart optionSource={selectedChart.genChart} height={360} />
              ) : (
                <Empty description={statusMeta[selectedChart.status || 'wait']?.label || '暂无图表'} />
              )}
            </section>
            <section>
              <span className="chart-detail-label">分析结论</span>
              <p className="chart-detail-result">
                {selectedChart.genResult ||
                  selectedChart.execMessage ||
                  '分析结论尚未生成'}
              </p>
            </section>
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default MyChartPage;
