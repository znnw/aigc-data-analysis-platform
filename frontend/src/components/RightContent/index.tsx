import { QuestionCircleOutlined } from '@ant-design/icons';
import { API_DOCS_URL } from '@/constants/brand';
import '@umijs/max';
import { Tooltip } from 'antd';

export type SiderTheme = 'light' | 'dark';

export const Question = () => {
  return (
    <button
      type="button"
      aria-label="打开接口文档"
      className="header-action-button"
      style={{
        display: 'flex',
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
      }}
      onClick={() => {
        window.open(API_DOCS_URL, '_blank', 'noopener,noreferrer');
      }}
    >
      <Tooltip title="接口文档">
        <QuestionCircleOutlined />
      </Tooltip>
    </button>
  );
};
