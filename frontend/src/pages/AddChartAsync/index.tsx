import SafeChart from '@/components/SafeChart';
import {
  genChartByAiAsyncUsingPOST,
  getChartByIdUsingGET,
} from '@/services/aigc/chartController';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  FileExcelOutlined,
  InboxOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RadarChartOutlined,
  ReloadOutlined,
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
  Result,
  Row,
  Segmented,
  Space,
  Spin,
  Steps,
  Upload,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import React, { useEffect, useState } from 'react';

const { Dragger } = Upload;
const ONE_MB = 1024 * 1024;

const chartTypeOptions = [
  { value: '折线图', label: <span><LineChartOutlined /> 折线图</span> },
  { value: '柱状图', label: <span><BarChartOutlined /> 柱状图</span> },
  { value: '堆叠图', label: <span><BarChartOutlined /> 堆叠图</span> },
  { value: '饼图', label: <span><PieChartOutlined /> 饼图</span> },
  { value: '雷达图', label: <span><RadarChartOutlined /> 雷达图</span> },
];

const statusMeta: Record<string, { label: string; className: string }> = {
  wait: { label: '排队中', className: 'is-waiting' },
  running: { label: '生成中', className: 'is-running' },
  succeed: { label: '已完成', className: 'is-success' },
  failed: { label: '生成失败', className: 'is-failed' },
};

const AddChartAsync: React.FC = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<API.Chart>();

  useEffect(() => {
    if (!activeJob?.id || activeJob.status === 'succeed' || activeJob.status === 'failed') {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await getChartByIdUsingGET(
          { id: activeJob.id },
          { skipErrorHandler: true },
        );
        if (!cancelled && res.data) {
          setActiveJob(res.data);
          if (res.data.status === 'succeed') {
            message.success('异步分析已完成');
          }
          if (res.data.status === 'failed') {
            message.error(res.data.execMessage || '异步分析失败');
          }
        }
      } catch {
        // A temporary polling failure should not interrupt the task view.
      }
      if (!cancelled) {
        timer = setTimeout(poll, 3000);
      }
    };

    timer = setTimeout(poll, 1800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeJob?.id, activeJob?.status]);

  const validateFile = (file: File) => {
    const suffix = file.name.toLowerCase().split('.').pop();
    if (suffix !== 'xlsx' && suffix !== 'xls') {
      message.warning('异步任务仅支持 .xlsx 或 .xls 文件');
      return Upload.LIST_IGNORE;
    }
    if (file.size > ONE_MB) {
      message.warning('文件大小不能超过 1MB');
      return Upload.LIST_IGNORE;
    }
    return false;
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
    try {
      const res = await genChartByAiAsyncUsingPOST({ ...values, file: undefined }, {}, file);
      if (!res.data?.chartId) {
        message.error('任务提交失败，请稍后重试');
        return;
      }
      message.success('分析任务已提交');
      setActiveJob({
        id: res.data.chartId,
        name: values.name || '异步分析任务',
        goal: values.goal,
        chartType: values.chartType,
        status: 'wait',
        createTime: new Date().toISOString(),
      });
      form.resetFields();
    } catch {
      // The shared request layer displays the backend error.
    } finally {
      setSubmitting(false);
    }
  };

  const jobStatus = activeJob?.status || 'wait';
  const jobMeta = statusMeta[jobStatus] || statusMeta.wait;
  const jobStep = jobStatus === 'succeed' ? 3 : jobStatus === 'running' ? 2 : jobStatus === 'wait' ? 1 : 2;

  return (
    <PageContainer title={false} className="analysis-page analysis-workbench-page">
      <div className="analysis-workbench-head">
        <div>
          <span className="workspace-kicker">ASYNCHRONOUS ANALYSIS</span>
          <h1>异步分析任务</h1>
          <p>提交耗时分析任务，页面会自动追踪执行状态和结果。</p>
        </div>
        <div className="analysis-mode-badge">
          <ClockCircleOutlined />
          后台执行
        </div>
      </div>

      <Row className="analysis-grid" gutter={[20, 20]}>
        <Col xs={24} xl={13}>
          <Card
            className="analysis-card analysis-config-card"
            title={
              <span className="analysis-card-title">
                <ClockCircleOutlined />
                任务配置
              </span>
            }
          >
            <Form
              form={form}
              name="addChartAsync"
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ chartType: '折线图' }}
            >
              <Form.Item
                name="goal"
                label="分析目标"
                rules={[{ required: true, message: '请输入分析目标' }]}
              >
                <TextArea
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  placeholder="例如：分析季度销售数据，找出增长最快的地区和品类"
                />
              </Form.Item>
              <Form.Item name="name" label="任务名称">
                <Input placeholder="例如：季度销售趋势分析" />
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
                  accept=".xlsx,.xls"
                  beforeUpload={validateFile}
                  className="analysis-dropzone"
                  showUploadList={{ showPreviewIcon: false }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">拖拽 Excel 到此处，或点击选择文件</p>
                  <p className="ant-upload-hint">
                    <FileExcelOutlined /> 支持 .xlsx / .xls，文件不超过 1MB
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
                    创建分析任务
                  </Button>
                  <Button htmlType="reset">重置</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={11}>
          <Card
            className="analysis-card task-status-card"
            title="任务状态"
            extra={
              activeJob ? (
                <span className={`status-pill ${jobMeta.className}`}>{jobMeta.label}</span>
              ) : undefined
            }
          >
            {activeJob ? (
              <div className="task-status-content">
                <Steps
                  size="small"
                  current={jobStep}
                  status={jobStatus === 'failed' ? 'error' : jobStatus === 'succeed' ? 'finish' : 'process'}
                  items={[
                    { title: '已提交' },
                    { title: '排队中' },
                    { title: 'AI 分析' },
                    { title: '完成' },
                  ]}
                />
                <div className="task-overview">
                  <span className="task-kicker">TASK #{activeJob.id}</span>
                  <h3>{activeJob.name || '未命名任务'}</h3>
                  <p>{activeJob.goal || '暂无分析目标'}</p>
                </div>
                {jobStatus === 'wait' || jobStatus === 'running' ? (
                  <div className="task-running-panel">
                    <Spin size="large" />
                    <strong>{jobStatus === 'wait' ? '任务正在排队' : '正在生成图表和结论'}</strong>
                    <span>页面每 3 秒自动更新，无需手动刷新。</span>
                  </div>
                ) : null}
                {jobStatus === 'failed' ? (
                  <Result
                    status="error"
                    title="任务执行失败"
                    subTitle={activeJob.execMessage || '请检查数据内容后重新提交'}
                  />
                ) : null}
                {jobStatus === 'succeed' ? (
                  <div className="task-result-panel">
                    <SafeChart optionSource={activeJob.genChart} height={280} />
                    <p>{activeJob.genResult}</p>
                  </div>
                ) : null}
                <Button
                  block
                  icon={<ReloadOutlined />}
                  onClick={() => setActiveJob(undefined)}
                >
                  新建另一个任务
                </Button>
              </div>
            ) : (
              <Empty
                className="task-empty"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="提交任务后，这里会显示实时执行状态"
              />
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default AddChartAsync;
