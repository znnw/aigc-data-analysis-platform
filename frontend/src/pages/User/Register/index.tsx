import AuthLayout from '@/components/AuthLayout';
import { APP_LOGO, APP_NAME } from '@/constants/brand';
import { userRegisterUsingPOST } from '@/services/aigc/userController';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, history, Link } from '@umijs/max';
import { message } from 'antd';
import React from 'react';
import Settings from '../../../../config/defaultSettings';

const Register: React.FC = () => {
  const handleSubmit = async (values: API.UserRegisterRequest) => {
    try {
      const res = await userRegisterUsingPOST(values);
      if (res.code === 0) {
        message.success('注册成功，请登录');
        history.push('/user/login');
        return;
      }
      message.error(res.message || '注册失败');
    } catch {}
  };

  return (
    <AuthLayout>
      <Helmet>
        <title>注册 - {Settings.title}</title>
      </Helmet>
      <LoginForm
        className="auth-login-form"
        contentStyle={{ minWidth: 280, maxWidth: 380 }}
        logo={<img alt={APP_NAME} src={APP_LOGO} />}
        title={APP_NAME}
        subTitle="创建分析账号"
        submitter={{
          searchConfig: {
            submitText: '注册',
          },
        }}
        onFinish={handleSubmit}
      >
        <ProFormText
          name="userAccount"
          fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
          placeholder="请输入用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 4, message: '用户名至少 4 个字符' },
          ]}
        />
        <ProFormText.Password
          name="userPassword"
          fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
          placeholder="请输入密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少 8 个字符' },
          ]}
        />
        <ProFormText.Password
          name="checkPassword"
          fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
          placeholder="请再次输入密码"
          dependencies={['userPassword']}
          rules={[
            { required: true, message: '请再次输入密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('userPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        />
        <div className="auth-form-link">
          <Link to="/user/login">已有账号，返回登录</Link>
        </div>
      </LoginForm>
    </AuthLayout>
  );
};

export default Register;
