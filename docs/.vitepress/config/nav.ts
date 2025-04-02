import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.Config['nav'] = [
  {
    text: 'AI编程',
    link: '/archives',
    activeMatch: '/archives'
  },
  {
    text: '大前端',
    link: '/archives',
    activeMatch: '/archives'
  },
  {
    text: '我的分类',
    items: [
      { text: 'Bug万象集', link: '/categories/issues/index', activeMatch: '/categories/issues/' },
      { text: '杂碎逆袭史', link: '/categories/fragments/index', activeMatch: '/categories/fragments/' },
      { text: '工具篇', link: '/categories/tools/index', activeMatch: '/categories/tools/' },
      { text: '方案总结', link: '/categories/solutions/index', activeMatch: '/categories/solutions/' },
      { text: '微服务篇', link: '/categories/microservice/index', activeMatch: '/categories/microservice/' },
      { text: '容器化部署', link: '/categories/docker/index', activeMatch: '/categories/docker/' },
    ],
    activeMatch: '/categories/'
  },
  {
    text: '我的小册',
    items: [
      { text: '设计模式篇', link: '/courses/design-mode/index', activeMatch: '/courses/design-mode/' },
      { text: 'Java篇', link: '/courses/java/index', activeMatch: '/courses/java/' },
      { text: 'MySQL篇', link: '/courses/mysql/index', activeMatch: '/courses/mysql/' },
      { text: 'MyBatis篇', link: '/courses/mybatis/index', activeMatch: '/courses/mybatis/' },
      { text: 'ElasticSearch篇', link: '/courses/elasticsearch/index', activeMatch: '/courses/elasticsearch/' },
      { text: '消息队列篇', link: '/courses/mq/index', activeMatch: '/courses/mq/' },
      { text: 'Redis篇', link: '/courses/redis/index', activeMatch: '/courses/redis/' },
    ],
    activeMatch: '/courses/'
  },
  {
    text: '我的标签',
    link: '/tags',
    activeMatch: '/tags'
  },
  {
    text: '我的归档',
    link: '/archives',
    activeMatch: '/archives'
  },
  {
    text: '关于',
    items: [
      { text: '关于知识库', link: '/about/index', activeMatch: '/about/index' }
      // { text: '关于我', link: '/about/me', activeMatch: '/about/me' }
    ],
    activeMatch: '/about/' // // 当前页面处于匹配路径下时, 对应导航菜单将突出显示
  },
];