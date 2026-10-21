import AuthLayout from '@/components/AuthLayout';
import { APP_LOGO, APP_NAME } from '@/constants/brand';
import { getLoginUserUsingGET, userLoginUsingPOST } from '@/services/aigc/userController';
import { Link } from '@@/exports';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, history, useModel } from '@umijs/max';
import { message } from 'antd';
import React from 'react';
import { flushSync } from 'react-dom';
import Settings from '../../../../config/defaultSettings';

const Login: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');

  /**
   * 登陆成功后，获取用户登录信息
   */
  const fetchUserInfo = async () => {
    const userInfo = await getLoginUserUsingGET();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo.data,
        }));
      });
    }
  };

  const handleSubmit = async (values: API.UserLoginRequest) => {
    try {
      // 登录
      const res = await userLoginUsingPOST(values);
      if (res.code === 0) {
        const defaultLoginSuccessMessage = '登录成功！';
        message.success(defaultLoginSuccessMessage);
        await fetchUserInfo();
        const urlParams = new URL(window.location.href).searchParams;
        history.push(urlParams.get('redirect') || '/');
        return;
      } else {
        message.error(res.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <AuthLayout>
      <Helmet>
        <title>
          {'登录'}- {Settings.title}
        </title>
      </Helmet>
      <LoginForm
        className="auth-login-form"
        contentStyle={{
          minWidth: 280,
          maxWidth: 380,
        }}
        logo={<img alt={APP_NAME} src={APP_LOGO} />}
        title={APP_NAME}
        subTitle="登录分析工作台"
        onFinish={async (values) => {
          await handleSubmit(values as API.UserLoginRequest);
        }}
      >
        <ProFormText
          name="userAccount"
          fieldProps={{
            size: 'large',
            prefix: <UserOutlined />,
          }}
          placeholder={'请输入用户名'}
          rules={[
            {
              required: true,
              message: '用户名是必填项！',
            },
          ]}
        />
        <ProFormText.Password
          name="userPassword"
          fieldProps={{
            size: 'large',
            prefix: <LockOutlined />,
          }}
          placeholder={'请输入密码'}
          rules={[
            {
              required: true,
              message: '密码是必填项！',
            },
          ]}
        />
        <div className="auth-form-link">
          <Link to="/user/register">没有账号？立即注册</Link>
        </div>
      </LoginForm>
    </AuthLayout>
  );
};
export default Login;
