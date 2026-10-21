import { APP_NAME } from '@/constants/brand';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Result } from 'antd';
import React from 'react';

const Admin: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  return (
    <PageContainer title="管理面板" className="analysis-page">
      <Card className="analysis-card">
        <Result
          status="success"
          title={`${APP_NAME}运行正常`}
          subTitle={`当前管理员：${initialState?.currentUser?.userName || 'admin'}`}
        />
      </Card>
    </PageContainer>
  );
};
export default Admin;
