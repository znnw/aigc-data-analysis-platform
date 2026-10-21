import { APP_AUTHOR, APP_NAME } from '@/constants/brand';
import { DefaultFooter } from '@ant-design/pro-components';
import '@umijs/max';
import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <DefaultFooter
      style={{
        background: 'none',
      }}
      copyright={`${currentYear} ${APP_NAME} · 作者 ${APP_AUTHOR}`}
      links={[]}
    />
  );
};

export default Footer;
