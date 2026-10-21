import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success?: boolean;
  code?: number;
  data?: any;
  message?: string;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, code, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      const failed = typeof code === 'number' ? code !== 0 : success === false;
      if (failed) {
        const resolvedMessage = errorMessage ?? (res as any).message ?? '请求失败';
        const error: any = new Error(resolvedMessage);
        error.name = 'BizError';
        error.info = {
          errorCode: errorCode ?? code,
          errorMessage: resolvedMessage,
          showType,
          data,
        };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        message.error(
          error.response.data?.message ||
            `服务响应异常（${error.response.status}），请稍后重试`,
        );
      } else if (error.request) {
        message.error('服务暂未响应，请检查网络后重试');
      } else {
        message.error(error?.message || '请求失败，请稍后重试');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      // const url = config?.url?.concat('?token = 123');
      // return { ...config, url };
      return config;
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      const { data } = response as unknown as ResponseStructure;

      if (data?.success === false || (typeof data?.code === 'number' && data.code !== 0)) {
        const error: any = new Error(data.message || '请求失败');
        error.name = 'BizError';
        error.info = {
          errorCode: data.errorCode ?? data.code,
          errorMessage: data.message || '请求失败',
          showType: data.showType,
          data: data.data,
        };
        throw error;
      }
      return response;
    },
  ],
};
