import SafeChart from '@/components/SafeChart';
import { genChartByAiUsingPOST } from '@/services/aigc/chartController';
import { parseChartOption } from '@/utils/chart';
import {
  BarChartOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  FileExcelOutlined,
  FullscreenOutlined,
  InboxOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RadarChartOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  message,
  Row,
  Segmented,
  Space,
  Spin,
  Steps,
  Upload,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import type ReactECharts from 'echarts-for-react';
import React, { useRef, useState } from 'react';

const { Dragger } = Upload;
const ONE_MB = 1024 * 1024;

const chartTypeOptions = [
  { value: '折线图', label: <span><LineChartOutlined /> 折线图</span> },
  { value: '柱状图', label: <span><BarChartOutlined /> 柱状图</span> },
  { value: '堆叠图', label: <span><BarChartOutlined /> 堆叠图</span> },
  { value: '饼图', label: <span><PieChartOutlined /> 饼图</span> },
  { value: '雷达图', label: <span><RadarChartOutlined /> 雷达图</span> },
];

const AddChart: React.FC = () => {
  const [chart, setChart] = useState<API.BiResponse>();
  const [option, setOption] = useState<Record<string, any>>();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [form] = Form.useForm();
  const chartComponentRef = useRef<ReactECharts>(null);
  const chartPanelRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      message.warning('同步分析仅支持 .xlsx 文件');
      return Upload.LIST_IGNORE;
    }
    if (file.size > ONE_MB) {
      message.warning('文件大小不能超过 1MB');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const downloadChart = () => {
    const instance = chartComponentRef.current?.getEchartsInstance();
    if (!instance) {
      return;
    }
    const url = instance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chart?.chartId || 'analysis'}-chart.png`;
    link.click();
  };

  const openFullscreen = async () => {
    await chartPanelRef.current?.requestFullscreen?.();
  };

  const resetWorkspace = () => {
    form.resetFields();
    setChart(undefined);
    setOption(undefined);
    setFailed(false);
  };

  const onFinish = async (values: any) => {
    if (submitting) {
      return;
    }

    const file = Array.isArray(values.file)
      ? values.file[0]?.originFileObj
      : values.file?.file?.originFileObj;
    if (!file) {
      message.warning('请上传 Excel 文件');
      return;
    }

    setSubmitting(true);
    setFailed(false);
    setChart(undefined);
    setOption(undefined);

    try {
      const res = await genChartByAiUsingPOST({ ...values, file: undefined }, {}, file);
      const parsedOption = parseChartOption(res.data?.genChart);
      if (!res.data || !parsedOption) {
        setFailed(true);
        message.error('分析结果格式异常，请重新尝试');
        return;
      }
      message.success('分析完成');
      setChart(res.data);
      setOption(parsedOption);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = chart ? 3 : submitting ? 2 : failed ? 2 : 0;

  return (
    <PageContainer title={false} className="analysis-page analysis-workbench-page">
      <div className="analysis-workbench-head">
        <div>
          <span className="workspace-kicker">SYNCHRONOUS ANALYSIS</span>
          <h1>智能分析工作台</h1>
          <p>上传业务数据，描述分析目标，快速生成可视化图表和结论。</p>
        </div>
        <div className="analysis-mode-badge">
          <ExperimentOutlined />
          实时生成
        </div>
      </div>

      <div className="analysis-step-bar">
        <Steps
          size="small"
          current={currentStep}
          status={failed ? 'error' : submitting ? 'process' : 'wait'}
          items={[
            { title: '上传数据', description: '.xlsx' },
            { title: '解析数据', description: submitting || chart ? '已解析' : '待处理' },
            { title: 'AI 分析', description: chart ? '已完成' : submitting ? '生成中' : '待执行' },
            { title: '输出结果', description: chart ? '已生成' : '图表与结论' },
          ]}
        />
      </div>

      <Row className="analysis-grid" gutter={[20, 20]}>
        <Col xs={24} xl={11}>
          <Card
            className="analysis-card analysis-config-card"
            title={
              <span className="analysis-card-title">
                <ExperimentOutlined />
                分析配置
              </span>
            }
          >
            <Form
              form={form}
              name="addChart"
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ chartType: '柱状图' }}
            >
              <Form.Item
                name="goal"
                label="分析目标"
                rules={[{ required: true, message: '请输入分析目标' }]}
              >
                <TextArea
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  placeholder="例如：分析最近七天的用户增长趋势，并指出异常波动"
                />
              </Form.Item>
              <Form.Item name="name" label="图表名称">
                <Input placeholder="给这次分析起一个容易识别的名字" />
              </Form.Item>
              <Form.Item name="chartType" label="图表类型">
                <Segmented block options={chartTypeOptions} />
              </Form.Item>
              <Form.Item
                name="file"
                label="原始数据"
                valuePropName="fileList"
                getValueFromEvent={(event) => event?.fileList}
                rules={[{ required: true, message: '请上传 Excel 文件' }]}
              >
                <Dragger
                  name="file"
                  maxCount={1}
                  accept=".xlsx"
                  beforeUpload={validateFile}
                  className="analysis-dropzone"
                  showUploadList={{ showPreviewIcon: false }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">拖拽 Excel 到此处，或点击选择文件</p>
                  <p className="ant-upload-hint">
                    <FileExcelOutlined /> 仅支持 .xlsx，文件不超过 1MB
                  </p>
                </Dragger>
              </Form.Item>
              <Form.Item className="analysis-actions">
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    disabled={submitting}
                    icon={<UploadOutlined />}
                  >
                    开始分析
                  </Button>
                  <Button htmlType="button" onClick={resetWorkspace}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={13}>
          <Card
            className="analysis-card analysis-conclusion-card"
            title="分析结论"
            extra={
              chart?.genResult ? <span className="analysis-complete-badge">已完成</span> : undefined
            }
          >
            <Spin spinning={submitting} tip="AI 正在分析数据">
              {chart?.genResult ? (
                <div className="analysis-conclusion-text">{chart.genResult}</div>
              ) : (
                <Empty
                  className="analysis-placeholder"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="分析结论将在这里出现"
                />
              )}
            </Spin>
          </Card>

          <Card
            className="analysis-card analysis-chart-card"
            title="可视化图表"
            extra={
              option ? (
                <Space>
                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={downloadChart}
                    aria-label="下载图表"
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<FullscreenOutlined />}
                    onClick={openFullscreen}
                    aria-label="全屏查看图表"
                  />
                </Space>
              ) : undefined
            }
          >
            <Spin spinning={submitting}>
              <div ref={chartPanelRef} className="analysis-chart-panel">
                {option ? (
                  <SafeChart
                    option={option}
                    chartRef={chartComponentRef}
                    height={380}
                    emptyText="分析结果暂无可视化图表"
                  />
                ) : (
                  <Empty
                    className="analysis-placeholder"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="图表将在这里出现"
                  />
                )}
              </div>
            </Spin>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default AddChart;
