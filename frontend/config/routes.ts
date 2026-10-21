export default [
  {
    path: '/user',
    layout: false,
    routes: [
      { path: '/user/login', component: './User/Login' },
      { path: '/user/register', component: './User/Register' },
    ],
  },
  { path: '/', redirect: '/add_chart' },
  { path: '/welcome', name: '平台概览', icon: 'home', component: './Welcome' },
  { path: '/add_chart', name: '智能分析', icon: 'barChart', component: './AddChart' },
  {
    path: '/add_chart_async',
    name: '异步分析',
    icon: 'barChart',
    component: './AddChartAsync',
  },
  { path: '/my_chart', name: '我的图表', icon: 'pieChart', component: './MyChart' },
  {
    path: '/admin',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      { path: '/admin', name: '系统管理', redirect: '/admin/sub-page' },
      { path: '/admin/sub-page', name: '管理面板', component: './Admin' },
    ],
  },
  { path: '*', layout: false, component: './404' },
];
